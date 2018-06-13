import merge from 'deepmerge';

import DefaultAdapter from '../default';

export default (C, ctx) => {
	const adapter = DefaultAdapter(C, ctx);
	return {
		...adapter,
		visitors: merge(adapter.visitors, {
			Parse: {
				pre: resource => {
					// eslint-disable-next-line no-param-reassign
					resource.output = `module.exports = ${resource.output};`;
					return adapter.runVisitor(resource, ['Parse', 'pre']);
				}
			}
		})
	};
};
