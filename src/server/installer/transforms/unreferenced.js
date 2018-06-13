import generate from '@babel/generator';
import traverse from '@babel/traverse';
import { codeFrameColumns } from '@babel/code-frame';

function containsReferences(path, nodes) {
	let result = false;
	const identifiers = nodes.filter(Boolean);
	if (path && identifiers.length) {
		path.traverse({
			Identifier(innerPath) {
				if (result) {
					innerPath.skip();
				} else if (identifiers.some(({ name }) => name === innerPath.node.name)) {
					innerPath.stop();
					result = true;
				}
			}
		});
	}
	return result;
}

function generateRemovalFrame(path) {
	const { code } = generate(path.node);
	const lineCount = code.split('\n').length;
	const location = {
		start: { column: 1, line: lineCount },
		end: { column: 2, line: lineCount }
	};
	return codeFrameColumns(code, location, {
		highlightCode: true,
		linesAbove: lineCount,
		message: `Removing unreferenced ${path.node.type}`
	});
}

export default (api, { logger, moduleId }) => ({
	visitor: {
		Scope: {
			exit(outerPath, state) {
				/**
				 * Avoid clearing cache / crawling more than necessary.
				 * babel-plugin-minify-dead-code-elimination will have already done this.
				 */
				if (!state.file.opts.plugins.some(({ key }) => key === 'minify-dead-code-elimination')) {
					traverse.cache.clear();
					outerPath.scope.crawl();
				}

				(function removeUnreferenced() {
					const possiblyUnreferenced = new Map();

					Object.keys(outerPath.scope.references).forEach(key => {
						const binding = outerPath.scope.getBinding(key);
						if (binding && !binding.referenced && !possiblyUnreferenced.has(key)) {
							possiblyUnreferenced.set(key, binding.path);
						}
					});

					if (possiblyUnreferenced.size > 0) {
						outerPath.traverse({
							ImportDeclaration(innerPath) {
								const specifiers = innerPath.get('specifiers');
								// Don't remove imports with no specifiers
								if (specifiers.length > 0) {
									const referencedSpecifiers = specifiers.filter(
										specifierPath => !possiblyUnreferenced.has(specifierPath.node.local.name)
									);
									// Only remove the import if none of its specifiers are referenced
									if (referencedSpecifiers.length === 0) {
										possiblyUnreferenced.set(innerPath, innerPath);
									}
								}
							},
							Identifier(innerPath) {
								if (possiblyUnreferenced.has(innerPath.node.name)) {
									const declaratorPath = innerPath.findParent(p => p.isVariableDeclarator());
									// Don't remove identifiers that are referenced in child scopes
									// or have references to module or exports in the declarator path
									if (
										!innerPath.scope.hasOwnBinding(innerPath.node.name) ||
										containsReferences(declaratorPath, [
											outerPath.scope.globals.exports,
											outerPath.scope.globals.module
										])
									) {
										possiblyUnreferenced.delete(innerPath.node.name);
									}
								}
							}
						});

						possiblyUnreferenced.forEach(bindingPath => {
							logger.trace(`${moduleId}:\n\n${generateRemovalFrame(bindingPath)}\n`);
							bindingPath.remove();
						});

						// If any references were removed, crawl the scope and traverse again
						if (possiblyUnreferenced.size > 0) {
							outerPath.scope.crawl();
							removeUnreferenced();
						}
					}
				})();
			}
		}
	}
});
