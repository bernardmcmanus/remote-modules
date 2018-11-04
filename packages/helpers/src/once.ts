import defineProperties from './defineProperties';

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
export default function once(fn: (...args: any[]) => any) {
	let called: boolean = false;
	let result: any;

	const clear = () => {
		called = false;
		result = undefined;
	};

	return defineProperties(
		(...args: any[]) => {
			if (!called) {
				called = true;
				result = fn(...args);
			}
			return result;
		},
		{ clear: { get: () => clear } }
	);
}
