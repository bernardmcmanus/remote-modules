import Interpolator from '../interpolator';
import defineProperties from '../helpers/defineProperties';

class Middleware {
	static parseArgs(args) {
		const apply = args.pop();
		let test = args.pop() || /.*/;
		if (test instanceof RegExp) {
			const regexp = test;
			test = ({ moduleId, request = moduleId }) => regexp.test(request);
		}
		if (typeof apply !== 'function' || typeof test !== 'function') {
			throw new TypeError('middleware signature is ([RegExp|Function], Function)');
		}
		return { test, apply };
	}

	constructor(descriptors) {
		if (!descriptors.type) {
			throw new Error('Middleware type is required');
		}
		defineProperties(this, descriptors, { enumerable: true });
	}

	fn = (...args) => (this.test(...args) ? this.apply(...args) : undefined);
}

export function GenericMiddleware(...args) {
	return new Middleware({
		type: 'context',
		name: 'GenericMiddleware',
		...Middleware.parseArgs(args)
	});
}

export function ExternalMiddleware(test) {
	return new Middleware({
		type: 'context',
		name: 'ExternalMiddleware',
		...Middleware.parseArgs([
			test,
			ctx => {
				ctx.external = true;
			}
		])
	});
}

export function RewriteMiddleware(...args) {
	const { test, apply } = Middleware.parseArgs(args);
	return new Middleware({
		type: 'context',
		name: 'RewriteMiddleware',
		apply: ctx => {
			const result = apply(ctx);
			if (result !== undefined) {
				ctx.request = result;
			}
		},
		test
	});
}

export function NullMiddleware(test) {
	return RewriteMiddleware(test, () => null);
}

export const BundleMiddleware = (() => {
	const interpolator = new Interpolator();
	let privateInstanceCounter = 0;

	// eslint-disable-next-line no-shadow
	return function BundleMiddleware({ template, test, ...options } = {}) {
		const instanceId = privateInstanceCounter;
		privateInstanceCounter += 1;

		function getBundleId(resource) {
			return interpolator(
				[instanceId, template, '{async}', '{adapter.outputType}']
					.filter(v => v !== undefined)
					.join('_'),
				resource
			);
		}

		const { test: testFn, apply } = Middleware.parseArgs([
			test,
			resource => {
				resource.addToBundle(getBundleId(resource), options);
			}
		]);

		return new Middleware({
			type: 'resource',
			name: 'BundleMiddleware',
			test: (resource, ctx) =>
				resource.isNormal() && resource.adapter.outputType !== 'raw' && testFn(resource, ctx),
			apply
		});
	};
})();
