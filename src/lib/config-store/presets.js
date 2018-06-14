import escapeRegExp from '../helpers/escapeRegExp';
import { mapObject } from '../helpers';
import { defaultCore } from '../resolver';
import { RewriteMiddleware } from './middleware';
import ConfigStore from './';

export default preset => {
	switch (preset) {
		case 'node':
			return {
				define: {
					// 'process.arch': process.arch,
					// 'process.platform': process.platform,
					// 'process.title': process.title,
					// 'process.version': process.version,
					'process.browser': false,
					'typeof window': 'undefined',
					'typeof document': 'undefined',
					'typeof XMLHttpRequest': 'undefined'
				}
			};
		case 'browser':
			return {
				core: mapObject(defaultCore, () => false),
				mainFields: ['browser', 'module', 'main'],
				define: {
					'process.browser': true,
					'typeof window': 'object',
					'typeof document': 'object',
					'typeof XMLHttpRequest': 'function'
				},
				provide: {
					global: 'window',
					process: `import process from '${ConfigStore.shims.process}'`,
					Buffer: `import { Buffer } from '${ConfigStore.mocks.buffer}'`
				},
				middleware: [
					RewriteMiddleware(
						new RegExp(
							`^(${Object.keys(ConfigStore.shims)
								.map(escapeRegExp)
								.join('|')})$`
						),
						ctx => ConfigStore.shims[ctx.request]
					)
				]
			};
		default:
			return {};
	}
};
