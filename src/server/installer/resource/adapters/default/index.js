import createParser from './parser';
import { createAdapter } from '../';

export default C =>
	createAdapter({
		outputType: 'js',
		parser: createParser(C),
		visitors: {
			Requests: {
				pre: resource => {
					const { logger } = C;
					const { moduleId } = resource;
					resource.applyMutations();
					resource.transform({
						plugins: [
							[require.resolve('../../../transforms/define'), resource.mutations],
							[require.resolve('../../../transforms/provide'), resource.mutations],
							C.get(['optimize', 'deadCode']) && 'babel-plugin-minify-dead-code-elimination',
							C.get(['optimize', 'constantFolding']) && 'babel-plugin-minify-constant-folding',
							C.get(['optimize', 'unreferenced']) && [
								require.resolve('../../../transforms/unreferenced'),
								{ logger, moduleId }
							],
							'@babel/plugin-transform-template-literals',
							'@babel/plugin-transform-modules-commonjs'
						].filter(Boolean)
					});
				},
				post: resource => {
					const meta = resource.getMeta();
					const { logger, outputTarget } = C;
					resource.transform({
						plugins: [
							[require.resolve('../../../transforms/module'), { logger, resource }],
							[require.resolve('../../../transforms/wrap'), { outputTarget, meta }]
						]
					});
				}
			},
			Generate: {
				post: resource => {
					if (C.uglify) {
						resource.compress();
					}
				}
			},
			Complete: {
				post: resource => {
					const { logger } = C;
					logger.debug(`Generate manifest for '${resource.moduleId}'`);
					return resource.resourceFactory.generateManifest(resource);
				}
			}
		}
	});
