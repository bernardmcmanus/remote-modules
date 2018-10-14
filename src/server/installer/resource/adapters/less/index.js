import merge from 'deepmerge';
import less from 'less';

import CSSAdapter from '../css';
import { isAbsoluteURL } from '../../../../../lib/helpers';
import { readFileAsync } from '../../../../../lib/helpers/fs';

class ImportManager extends less.FileManager {
	constructor(resource) {
		super();
		this.resource = resource;
	}
	// eslint-disable-next-line class-methods-use-this
	supports(filename) {
		return !isAbsoluteURL(filename);
	}
	// eslint-disable-next-line class-methods-use-this
	supportsSync() {
		return false;
	}
	async loadFile(request) {
		const { resource } = this;
		const dependency = resource.resourceFactory(request, resource);

		if (dependency.error) {
			throw dependency.error;
		}

		resource.resolverPaths.add(dependency.getOriginDir());

		return {
			contents: dependency.source || (await readFileAsync(dependency.origin)),
			filename: dependency.slug
		};
	}
}

export default (C, ctx) => {
	const adapter = CSSAdapter(C, ctx);
	return {
		...adapter,
		visitors: merge(adapter.visitors, {
			Parse: {
				pre: async resource => {
					const { parser } = resource.adapter;
					const { css, map } = await less.render(resource.output, {
						filename: resource.slug,
						javascriptEnabled: true,
						sourceMap: Boolean(resource.options.sourceMaps) && {
							outputSourceFiles: true
						},
						relativeUrls: true,
						plugins: [
							{
								install(_, pluginManager) {
									pluginManager.addFileManager(new ImportManager(resource));
								},
								minVersion: [2, 3, 1]
							}
						]
					});
					if (map) {
						const sourceMapJSON = {
							...JSON.parse(map),
							sourceRoot: parser.sourceRoot
						};
						parser.sourceMapJSON = sourceMapJSON;
					}
					// eslint-disable-next-line no-param-reassign
					resource.output = css;
					return adapter.runVisitor(resource, ['Parse', 'pre']);
				}
			}
		})
	};
};
