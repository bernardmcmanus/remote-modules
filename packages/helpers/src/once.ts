import defineProperties from './defineProperties';
import { GenericFunction } from '../types';

export type OnceProps = {
	clear: () => void;
};

/**
 * Creates a function that caches the first value returned by fn
 * @since 0.1.0
 *
 * @example
 * const cachedFunc = once(() => Math.round(Math.random() * 10));
 *
 * cachedFunc(); // => 8
 * cachedFunc(); // => 8
 *
 * cachedFunc.clear();
 *
 * cachedFunc(); // => 2
 */
export default function once<T extends GenericFunction>(fn: T): T & OnceProps {
	let called = false;
	let result: ReturnType<T> | undefined;

	return <any>defineProperties(
		(...args: any[]) => {
			if (!called) {
				called = true;
				try {
					result = fn(...args);
				} catch (err) {
					result = err;
				}
			}
			if (<unknown>result instanceof Error) {
				throw result;
			}
			return result;
		},
		{
			clear: () => {
				called = false;
				result = undefined;
			}
		},
		{ writable: false }
	);
}
