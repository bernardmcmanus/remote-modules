import defineProperties from './defineProperties';
import identity from './identity';
import { GenericFunction } from '../types';

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
	T extends GenericFunction,
	U extends Function = typeof identity,
	V extends Cache = Map<any, ReturnType<T>>
>(fn: T, resolver = <U>(identity as unknown), cache = <V>new Map()): T & MemoizeProps<U, V> {
	return <any>defineProperties(
		(...args: any[]) => {
			const key = resolver(...args);
			let value;
			if (cache.has(key)) {
				value = cache.get(key);
			} else {
				try {
					value = fn(...args);
				} catch (err) {
					value = err;
				}
				cache.set(key, value);
			}
			if (value instanceof Error) {
				throw value;
			}
			return value;
		},
		{ cache, resolver }
	);
}
