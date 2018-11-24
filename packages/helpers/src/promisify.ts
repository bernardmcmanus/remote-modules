import identity from './identity';
import { GenericFunction, ObjectMap } from '../types';

export type Options = {
	defaults?: ObjectMap<any>;
	xargs?: GenericFunction;
};

/**
 * Wraps a function that accepts a callback with signature (err, result)
 * Note: This is not the same as [asyncify]{@link ./asyncify}
 * @since 0.1.0
 * @see [Bluebird.promisify]{@link http://bluebirdjs.com/docs/api/promise.promisify.html}
 * @see [util.promisify]{@link https://nodejs.org/api/util.html#util_util_promisify_original}
 *
 * @example
 * const writeFileAsync = promisify(fs.writeFile, fs);
 *
 * const readFileAsync = promisify(fs.readFile, fs, {
 * 	defaults: { 1: 'utf8' }
 * });
 *
 * const existsAsync = promisify(fs.exists, fs, {
 * 	xargs: ([result]) => [null, result]
 * });
 */
export default function promisify<T extends GenericFunction, U extends Options>(
	fn: T,
	context?: any,
	{ defaults = {}, xargs = identity }: U = <U>{}
): T & GenericFunction<any, Promise<ReturnType<T>>> {
	return <any>((...inputArgs: any[]) =>
		new Promise((resolve, reject) => {
			const argsWithDefaults = Object.assign([], defaults, inputArgs);
			fn.call(context, ...argsWithDefaults, (...args: any[]) => {
				const [err, result] = xargs(args);
				return err ? reject(err) : resolve(result);
			});
		}));
}
