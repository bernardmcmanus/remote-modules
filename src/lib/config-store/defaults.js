import noop from '../helpers/noop';

import DefaultAdapter from '../../server/installer/resource/adapters/default';
import RawAdapter from '../../server/installer/resource/adapters/raw';
import JSONAdapter from '../../server/installer/resource/adapters/json';
import LESSAdapter from '../../server/installer/resource/adapters/less';
import CSSAdapter from '../../server/installer/resource/adapters/css';

import { defaultCore, defaultExtensions, defaultMainFields, defaultModuleDirs } from '../resolver';
import { isAbsoluteURL } from '../helpers';
import { ExternalMiddleware } from './middleware';
import ConfigStore from './';

export default function getDefaults(key) {
	switch (key) {
		case 'adapters':
			return [
				{
					test: ctx => ctx.extension === '.less',
					adapter: LESSAdapter
				},
				{
					test: ctx => ctx.extension === '.css',
					adapter: CSSAdapter
				},
				{
					test: ctx => ctx.extension === '.json',
					adapter: JSONAdapter
				},
				{
					// FIXME: RawAdapter should be default
					test: ctx => !defaultExtensions.includes(ctx.extension),
					adapter: RawAdapter
				},
				{
					test: () => true,
					adapter: DefaultAdapter
				}
			];
		case 'babylon':
			return {
				sourceType: 'module',
				plugins: [
					'asyncGenerators',
					'classProperties',
					'dynamicImport',
					'exportDefaultFrom',
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
					// https://github.com/mishoo/UglifyJS2/issues/2941
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
					ExternalMiddleware(/^data:\w+/i)
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
