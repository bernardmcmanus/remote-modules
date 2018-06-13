import defineProperties from './defineProperties';

/**
 * @typedef {function} cachedFunction
 * @property {function} clear - Clear the cache and allows cachedFunction to be called again
 * @return {?} The first result of {@code fn}
 */

/**
 * Creates a function that caches the first value returned by {@code fn}
 * @since 0.1.0
 *
 * @param {function} fn - The function to cache
 * @return {cachedFunction}
 *
 * @example
 * const cachedFunc = once(() => random(10));
 *
 * cachedFunc(); // => 8
 * cachedFunc(); // => 8
 *
 * cachedFunc.clear();
 *
 * cachedFunc(); // => 2
 */
export default function once(fn) {
	let result;
	let called;
	const clear = () => {
		called = false;
		result = undefined;
	};
	return defineProperties(
		(...args) => {
			if (!called) {
				called = true;
				result = fn(...args);
			}
			return result;
		},
		{ clear: { get: () => clear } }
	);
}
