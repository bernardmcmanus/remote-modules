import defineProperties from './defineProperties';

/**
 * @typedef Map
 * @see [Map | MDN]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map}
 */

/**
 * @typedef {function} defaultResolver
 * @return {?} The first argument
 */
const defaultResolver = (...args) => args[0];

/**
 * Creates a function that caches the value returned by {@code fn}
 * @since 0.1.0
 *
 * @param {function} fn - The function to memoize
 * @param {function} [resolver=[defaultResolver]{@link module:memoize~defaultResolver}] - A function that returns the cache key
 * @param {Map} [cache=[Map]{@link module:memoize~Map}] - A {@code Map}, or any object that implements the [Map]{@link module:memoize~Map} interface
 * @return {function}
 */
export default function memoize(fn, resolver = defaultResolver, cache = new Map()) {
	return defineProperties(
		(...args) => {
			const key = resolver(...args);
			let value;
			if (cache.has(key)) {
				value = cache.get(key);
			} else {
				value = fn(...args);
				cache.set(key, value);
			}
			return value;
		},
		{ cache, resolver }
	);
}
