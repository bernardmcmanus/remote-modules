import noop from '../helpers/noop';

import { defaultCore, defaultExtensions, defaultMainFields, defaultModuleDirs } from '../resolver';
import { isAbsoluteURL, isDataURL } from '../helpers';
import { ExternalMiddleware } from './middleware';
import ConfigStore from './';

export default function getDefaults(key) {
	switch (key) {
		case 'adapters': {
			const {
				CSSAdapter,
				LESSAdapter,
				SASSAdapter,
				JSONAdapter,
				ScriptAdapter
			} = ConfigStore.adapters;
			return [
				{
					test: ctx => ctx.extension === '.css',
					adapter: CSSAdapter
				},
				{
					test: ctx => ctx.extension === '.less',
					adapter: LESSAdapter
				},
				{
					test: ctx => ctx.extension === '.sass' || ctx.extension === '.scss',
					adapter: SASSAdapter
				},
				{
					test: ctx => ctx.extension === '.json',
					adapter: JSONAdapter
				},
				{
					test: ctx => defaultExtensions.includes(ctx.extension),
					adapter: ScriptAdapter
				}
			];
		}
		case 'babylon':
			return {
				sourceType: 'module',
				plugins: [
					'asyncGenerators',
					'classProperties',
					'dynamicImport',
					'exportDefaultFrom',
					'exportNamespaceFrom',
					'jsx',
					'objectRestSpread'
				]
			};
		case 'optimize':
			return {
				constantFolding: noop(/* calculated */),
				deadCode: true,
				unreferenced: true
			};
		case 'uglify':
			return {
				compress: {
					// https://github.com/mishoo/UglifyJS2/issues/2874
					inline: false
				},
				output: {
					comments: false
				}
			};
		default:
			return {
				root: '.',
				entry: '.',
				output: '.remote',
				config: '.modulerc',
				env: ConfigStore.getEnv(),
				define: {
					'process.env.NODE_ENV': noop(/* calculated */),
					'typeof process': 'object'
				},
				provide: {},
				optimize: getDefaults('optimize'),
				include: [],
				strict: false,
				core: defaultCore,
				extensions: defaultExtensions,
				mainFields: defaultMainFields,
				moduleDirs: defaultModuleDirs,
				outputTarget: 'module',
				babel: {
					envName: noop(/* calculated */)
				},
				babylon: getDefaults('babylon'),
				preset: undefined,
				uglify: noop(/* calculated */),
				adapters: getDefaults('adapters'),
				middleware: [
					// Treat absolute URIs as external resources
					ExternalMiddleware(ctx => isAbsoluteURL(ctx.request)),
					// Treat data URIs as external resources
					ExternalMiddleware(ctx => isDataURL(ctx.request))
				],
				server: {
					port: 3000,
					uri: 'http://localhost:3000',
					static: [],
					redirects: noop(/* calculated */),
					publicPath: noop(/* calculated */)
				},
				watch: false
			};
	}
}
