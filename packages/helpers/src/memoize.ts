import defineProperties from './defineProperties';
import identity from './identity';

export type Cache = Map<any, any> | WeakMap<any, any>;

export type MemoizeProps<U, V> = {
	resolver: U;
	cache: V extends Map<any, any> ? Map<any, any> : WeakMap<any, any>;
};

/**
 * Creates a function that caches the value returned by fn
 * @since 0.1.0
 */
export default function memoize<
	T extends Function,
	U extends Function,
	V extends Cache = Map<any, any>
>(fn: T, _resolver?: U, _cache?: V): T & MemoizeProps<U, V> {
	const resolver = _resolver || identity;
	const cache = _cache || new Map();
	return <any>defineProperties(
		(...args: any[]) => {
			// @ts-ignore
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
