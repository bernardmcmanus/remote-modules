import * as t from '@babel/types';
import Template from '@babel/template';
import generate from '@babel/generator';
import { codeFrameColumns } from '@babel/code-frame';

import generateResourceRequest from '../generators/resource-request';

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

function isRequire(path) {
	return path.node.callee.name === 'require' && !isRequireResolve(path.get('arguments.0'));
}

export default (api, { logger, resource }) => {
	const moduleIdentifier = t.Identifier('module');
	const requireIdentifier = t.Identifier('$require');
	const importIdentifier = t.MemberExpression(moduleIdentifier, t.Identifier('import'));
	const buildQuery = (...args) => resource.adapter.parser.buildQuery(...args);

	function printRequestWarning(path) {
		const program = path.scope.getProgramParent();
		const { code } = generate(program.block, { retainLines: true });
		const location = path.node.loc;
		const frame = codeFrameColumns(code, location, {
			message: 'Cannot statically determine request value',
			highlightCode: true
		});
		logger.warn(`${resource.moduleId}:\n\n${frame}\n`);
	}

	function replaceStatic(path, request) {
		const ctx = resource.contextFactory(request, resource.getResolverPaths());
		switch (true) {
			case Boolean(ctx.error):
				path.replaceWith(
					moduleNotFoundTemplate({
						MODULE: moduleIdentifier,
						REQUEST: request.node
					})
				);
				break;
			case ctx.isExternal():
				path.replaceWith(t.CallExpression(requireIdentifier, [t.StringLiteral(ctx.moduleId)]));
				break;
			case ctx.isNull(): {
				const declaratorPath = path.findParent(p => p.isVariableDeclarator());
				const targetPath = declaratorPath ? declaratorPath.get('init') : path;
				targetPath.replaceWith(t.Identifier('null'));
				targetPath.addComment('leading', request.value);
				break;
			}
			default:
				path.replaceWith(t.CallExpression(requireIdentifier, [t.NumericLiteral(ctx.pid)]));
				path.addComment('leading', request.value);
				break;
		}
	}

	function replaceRequest(path) {
		const request = generateResourceRequest(path.node, buildQuery);
		switch (true) {
			case isRequireResolve(path):
				if (request.dynamic) {
					path.replaceWith(
						t.CallExpression(t.MemberExpression(moduleIdentifier, t.Identifier('resolveDynamic')), [
							request.node
						])
					);
				} else {
					const ctx = resource.contextFactory(request, resource.getResolverPaths());
					if (ctx.isNull()) {
						path.replaceWith(
							moduleNotFoundTemplate({
								MODULE: moduleIdentifier,
								REQUEST: request.node
							})
						);
					} else {
						path.replaceWith(t.StringLiteral(ctx.moduleId));
					}
				}
				break;
			case request.async:
				if (request.dynamic) {
					path.replaceWith(
						t.CallExpression(importIdentifier, [
							t.CallExpression(
								t.MemberExpression(moduleIdentifier, t.Identifier('resolveDynamic')),
								[request.node]
							)
						])
					);
				} else {
					const ctx = resource.contextFactory(request, resource.getResolverPaths());
					path.replaceWith(t.CallExpression(importIdentifier, [t.StringLiteral(ctx.moduleId)]));
				}
				break;
			case request.href: {
				if (request.dynamic) {
					printRequestWarning(path);
					path.replaceWith(
						t.CallExpression(t.MemberExpression(moduleIdentifier, t.Identifier('resolveURL')), [
							t.CallExpression(
								t.MemberExpression(moduleIdentifier, t.Identifier('resolveDynamic')),
								[request.node]
							)
						])
					);
				} else {
					const ctx = resource.contextFactory(request, resource.getResolverPaths());
					path.replaceWith(t.StringLiteral(ctx.url));
				}
				break;
			}
			case request.dynamic:
				printRequestWarning(path);
				path.replaceWith(
					t.CallExpression(requireIdentifier, [
						t.CallExpression(t.MemberExpression(moduleIdentifier, t.Identifier('resolveDynamic')), [
							request.node
						])
					])
				);
				break;
			default:
				replaceStatic(path, request);
				break;
		}
	}

	return {
		visitor: {
			MemberExpression(path) {
				const { object, property } = path.node;
				if (object.name === 'System' && property.name === 'import') {
					// FIXME: Move this to a CallExpression visitor?
					replaceRequest(path.parentPath);
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
				if (t.isImport(path.node.callee) || isRequire(path) || isRequireResolve(path)) {
					replaceRequest(path);
				}
			}
		}
	};
};
