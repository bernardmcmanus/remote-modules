import identity from './identity';

/**
 * Wraps a function that accepts a callback with signature {@code (err, result)}
 * {@br}
 * {@bold Note:} This is not the same as [asyncify]{@link module:asyncify}
 * @since 0.1.0
 * @see [Bluebird.promisify]{@link http://bluebirdjs.com/docs/api/promise.promisify.html}
 * @see [util.promisify]{@link https://nodejs.org/api/util.html#util_util_promisify_original}
 *
 * @param {function} fn - The function to wrap
 * @param {object} [context] - The function context
 * @param {object} [options]
 * @param {object} [options.defaults={}] - Default arguments to be passed to {@code fn}
 * @param {object} [options.xargs=[identity]{@link module:identity}] - A function to transform result args
 * @return {function}
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
export default function promisify(fn, context, { defaults = {}, xargs = identity } = {}) {
	return (...inputArgs) =>
		new Promise((resolve, reject) => {
			const argsWithDefaults = Object.assign([], defaults, inputArgs);
			fn.call(context, ...argsWithDefaults, (...args) => {
				const [err, result] = xargs(args);
				return err ? reject(err) : resolve(result);
			});
		});
}
