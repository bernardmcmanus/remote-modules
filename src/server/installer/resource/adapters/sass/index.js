import Path from 'path';

import merge from 'deepmerge';
import sass from 'node-sass';

import CSSAdapter from '../css';
import promisify from '../../../../../lib/helpers/promisify';
import { readFileAsync } from '../../../../../lib/helpers/fs';
import { parseAttributes } from '../../../../../lib/request-attributes';

const renderAsync = promisify(sass.render);

export default (C, ctx) => {
	const adapter = CSSAdapter(C, ctx);
	return {
		...adapter,
		visitors: merge(adapter.visitors, {
			Parse: {
				pre: async resource => {
					const { css } = await renderAsync({
						file: resource.origin,
						data: resource.source,
						importer: (request, prev, done) => {
							const { attributes } = parseAttributes(request);
							if (attributes.href) {
								done({ contents: `@import url('${request}');` });
							} else {
								const dependency = resource.resourceFactory(request, resource);
								if (dependency.isNormal()) {
									resource.resolverPaths.add(dependency.getOriginDir());
									Promise.resolve(dependency.source || readFileAsync(dependency.origin))
										.then(contents => {
											done({ contents, file: dependency.origin });
										})
										.catch(done);
								} else {
									done(null);
								}
							}
						},
						indentedSyntax: Path.extname(resource.slug) === '.sass'
						// https://github.com/bernardmcmanus/remote-modules/issues/10
						// sourceMapContents: true,
						// sourceMapEmbed: true,
						// sourceMapRoot: resource.options.rootDir
					});
					// eslint-disable-next-line no-param-reassign
					resource.output = css.toString('utf8');
					return adapter.runVisitor(resource, ['Parse', 'pre']);
				}
			}
		})
	};
};
