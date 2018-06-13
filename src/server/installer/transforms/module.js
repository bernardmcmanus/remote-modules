import * as t from '@babel/types';
import generate from '@babel/generator';
import Template from '@babel/template';
import { codeFrameColumns } from '@babel/code-frame';

const moduleNotFoundTemplate = Template(`
	MODULE._throwNotFound(REQUEST);
`);

function isRequireResolve(path) {
	return (
		path.isCallExpression() &&
		path.get('callee.property').isIdentifier({ name: 'resolve' }) &&
		path.get('callee.object').isIdentifier({ name: 'require' })
	);
}

export default (api, { logger, resource }) => {
	const requestMap = resource.getRequestMap();
	const moduleIdentifier = t.Identifier('module');
	const requireIdentifier = t.Identifier('$require');
	const importIdentifier = t.MemberExpression(moduleIdentifier, t.Identifier('import'));

	function getRequestContext(resourceNode) {
		const request = t.isStringLiteral(resourceNode)
			? resourceNode.value
			: generate(resourceNode).code;
		return resource.contextFactory(request, resource.getResolverPaths());
	}

	function getDynamicRequest(resourceNode) {
		const ctx = getRequestContext(resourceNode);
		return ctx.error
			? t.CallExpression(t.MemberExpression(moduleIdentifier, t.Identifier('resolveDynamic')), [
					resourceNode
			  ])
			: t.StringLiteral(ctx.moduleId);
	}

	function mapRequest(originalResourceNode) {
		const { value } = originalResourceNode;
		let mappedResourceNode = originalResourceNode;
		if (t.isStringLiteral(originalResourceNode) && requestMap.has(value)) {
			const nextValue = requestMap.get(value);
			switch (true) {
				case typeof nextValue === 'boolean':
					mappedResourceNode = t.BooleanLiteral(nextValue);
					break;
				case typeof nextValue === 'number':
					mappedResourceNode = t.NumericLiteral(nextValue);
					break;
				case typeof nextValue === 'string':
					mappedResourceNode = t.StringLiteral(nextValue);
					break;
				case nextValue === null:
				case nextValue === undefined:
					mappedResourceNode = null;
					break;
				default:
					mappedResourceNode = t.Identifier(nextValue);
					break;
			}
		}
		return mappedResourceNode;
	}

	function replaceWithLoader(path, originalResourceNode, identifierNode) {
		const mappedResourceNode = mapRequest(originalResourceNode);
		if (mappedResourceNode) {
			if (t.isNumericLiteral(mappedResourceNode)) {
				path.addComment('leading', originalResourceNode.value);
			} else if (!t.isStringLiteral(mappedResourceNode) && identifierNode !== importIdentifier) {
				// FIXME: handle conditionals / expression arguments
				const program = path.scope.getProgramParent();
				const { code } = generate(program.block, { retainLines: true });
				const location = path.node.loc;
				const frame = codeFrameColumns(code, location, {
					message: 'require argument is an expression',
					highlightCode: true
				});
				logger.warn(`${location.filename}:\n\n${frame}\n`);
			}
			path.replaceWith(t.CallExpression(identifierNode, [mappedResourceNode]));
		} else {
			path.addComment('leading', originalResourceNode.value);
			path.replaceWith(t.ObjectExpression([]));
		}
	}

	return {
		visitor: {
			Import(path) {
				const targetPath = path.findParent(parentPath => parentPath.isCallExpression());
				if (targetPath) {
					const [resourceNode] = targetPath.node.arguments;
					const requestNode = getDynamicRequest(resourceNode);
					replaceWithLoader(targetPath, requestNode, importIdentifier);
				}
			},
			MemberExpression(path) {
				const { object, property } = path.node;
				if (object.name === 'System' && property.name === 'import') {
					// FIXME: Move this to a CallExpression visitor?
					const { parent, parentPath } = path;
					const [resourceNode] = parent.arguments;
					const requestNode = getDynamicRequest(resourceNode);
					replaceWithLoader(parentPath, requestNode, importIdentifier);
				} else if (object.name === 'require' && property.name === 'cache') {
					// FIXME: Move this to an Identifier visitor?
					const registryIdentifier = t.MemberExpression(moduleIdentifier, t.Identifier('registry'));
					if (t.isMemberExpression(path.parent)) {
						path.parentPath.replaceWith(
							t.CallExpression(t.MemberExpression(registryIdentifier, t.Identifier('get')), [
								path.parent.property
							])
						);
					} else {
						path.replaceWith(registryIdentifier);
					}
				}
			},
			CallExpression(path) {
				if (path.node.callee.name === 'require' && !isRequireResolve(path.get('arguments.0'))) {
					const [resourceNode] = path.node.arguments;
					const ctx = getRequestContext(resourceNode);
					if (ctx.error) {
						path.replaceWith(
							moduleNotFoundTemplate({
								MODULE: moduleIdentifier,
								REQUEST: resourceNode
							})
						);
					} else {
						replaceWithLoader(path, resourceNode, requireIdentifier);
					}
				} else if (isRequireResolve(path)) {
					const [resourceNode] = path.node.arguments;
					const ctx = getRequestContext(resourceNode);
					if (ctx.isNull()) {
						path.replaceWith(
							moduleNotFoundTemplate({
								MODULE: moduleIdentifier,
								REQUEST: resourceNode
							})
						);
					} else {
						path.replaceWith(t.StringLiteral(ctx.moduleId));
					}
				}
			}
		}
	};
};
