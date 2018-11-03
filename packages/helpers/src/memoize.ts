import defineProperties from './defineProperties';
import identity from './identity';

/**
 * Creates a function that caches the value returned by fn
 * @since 0.1.0
 */
export default function memoize(
	fn: (...args: any[]) => any,
	resolver = identity,
	cache = new Map()
) {
	return defineProperties(
		(...args: any[]) => {
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
