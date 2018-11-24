import identity from './identity';
import noop from './noop';
import { GenericFunction } from '../types';

export type Deferred<T extends GenericFunction> = {
	resolve: (value?: any) => void;
	reject: (reason?: Error) => void;
	promise: Promise<ReturnType<T>>;
};

/**
 * Creates a new Deferred object
 * @see [Deferred | MDN]{@link https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred}
 * @since 0.1.0
 */
export default function Deferred<T extends GenericFunction = typeof identity>(
	onResolved: T = <T>identity,
	onRejected?: (err?: Error) => any
): Deferred<T> {
	let resolve = noop;
	let reject = noop;
	const promise = new Promise((...args) => {
		[resolve, reject] = args;
	}).then(onResolved, onRejected);
	return { resolve, reject, promise };
}
