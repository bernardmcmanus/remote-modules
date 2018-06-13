import last from './last';

/**
 * Wraps a function with signature {@code (...args, callback)}
 * {@br}
 * {@bold Note:} This is not the same as [promisify]{@link module:promisify}
 * @since 0.1.0
 *
 * @param {function} fn - The function to wrap
 * @param {object} [context] - The function context
 * @return {function}
 *
 * @example
 * // before
 * compiler.plugin('emit', (asset, cb) => {
 * 	doSomethingAsync()
 * 		.then(result => cb(null, result))
 * 		.catch(err => cb(err));
 * });
 *
 * // after
 * compiler.plugin('emit', asyncify(asset => {
 * 	return doSomethingAsync();
 * }));
 */
export default function asyncify(fn, context) {
	return (...args) => {
		const cb = last(args);
		const other = args.slice(0, -1);
		return Promise.resolve()
			.then(() => fn.call(context, ...other))
			.then(result => cb(null, result))
			.catch(err => cb(err));
	};
}
