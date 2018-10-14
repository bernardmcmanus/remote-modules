import Path from 'path';

import merge from 'deepmerge';
import sass from 'node-sass';

import CSSAdapter from '../css';
import promisify from '../../../../../lib/helpers/promisify';
import { readFileAsync } from '../../../../../lib/helpers/fs';
import { parseAttributes, stripAttributes } from '../../../../../lib/request-attributes';

const renderAsync = promisify(sass.render);

export default (C, ctx) => {
	const adapter = CSSAdapter(C, ctx);
	return {
		...adapter,
		visitors: merge(adapter.visitors, {
			Parse: {
				pre: async resource => {
					const { parser } = resource.adapter;
					// node-sass won't produce source maps if source is passed as
					// options.data and options.sourceMap is not a string, so we
					// just pass an arbitrary path relative to the module root.
					const sourceMap =
						resource.options.sourceMaps && Path.join(resource.options.rootDir, 'sass.map');
					const { css, map } = await renderAsync({
						file: resource.origin,
						data: resource.source,
						importer: (request, prev, done) => {
							const dependency = resource.resourceFactory(stripAttributes(request), resource);
							const { attributes } = parseAttributes(request);
							if (attributes.href) {
								done({
									contents: `@import url('${request}');`,
									file: dependency.origin
								});
							} else if (dependency.isNormal()) {
								resource.resolverPaths.add(dependency.getOriginDir());
								Promise.resolve(dependency.source || readFileAsync(dependency.origin))
									.then(contents => {
										done({ contents, file: dependency.origin });
									})
									.catch(done);
							} else {
								done(null);
							}
						},
						indentedSyntax: Path.extname(resource.slug) === '.sass',
						omitSourceMapUrl: true,
						sourceMap,
						sourceMapContents: sourceMap,
						sourceMapRoot: parser.sourceRoot
					});
					if (map) {
						const sourceMapJSON = {
							...JSON.parse(map),
							file: resource.slug
						};
						parser.sourceMapJSON = sourceMapJSON;
					}
					// eslint-disable-next-line no-param-reassign
					resource.output = css.toString('utf8');
					return adapter.runVisitor(resource, ['Parse', 'pre']);
				}
			}
		})
	};
};
