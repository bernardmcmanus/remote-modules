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
					'process.browser': false,
					'typeof window': 'undefined',
					'typeof document': 'undefined',
					'typeof XMLHttpRequest': 'undefined'
				}
			};
		case 'browser':
			return {
				core: mapObject(defaultCore, () => false),
				mainFields: ['browser'],
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
					// Rewrite requests for node core modules to browser shims
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
