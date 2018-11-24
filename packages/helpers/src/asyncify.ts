import last from './last';
import { GenericFunction } from '../types';

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
export default function asyncify<T extends GenericFunction>(
	fn: T,
	context?: any
): T & GenericFunction<any, Promise<ReturnType<T>>> {
	return <any>(async (...args: any[]) => {
		const cb = last(args);
		const other = args.slice(0, -1);
		try {
			const result = await fn.apply(context, other);
			return cb(null, result);
		} catch (err) {
			return cb(err);
		}
	});
}
