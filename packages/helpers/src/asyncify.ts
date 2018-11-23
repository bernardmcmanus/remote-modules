import last from './last';

/**
 * Wraps a function with signature (...args, callback)
 * Note: This is not the same as [promisify]{@link ./promisify}
 *
 * @since 0.1.0
 * @example
 * // before
 * compiler.plugin('emit', (asset, cb) => {
 * 	doSomethingAsync()
 * 		.then(result => cb(null, result))
 * 		.catch(err => cb(err));
 * });
 *
 * // after
 * compiler.plugin('emit', asyncify(async asset => {
 * 	const result = await doSomethingAsync();
 *  return result;
 * }));
 */
export default function asyncify(fn: (...args: any[]) => any, context?: any) {
	return async (...args: any[]) => {
		const cb = last(args);
		const other = args.slice(0, -1);
		try {
			const result = await fn.apply(context, other);
			return cb(null, result);
		} catch (err) {
			return cb(err);
		}
	};
}
