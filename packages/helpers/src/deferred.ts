import identity from './identity';
import noop from './noop';

export type deferred = {
	resolve: (value?: any) => void;
	reject: (reason?: Error) => void;
	promise: Promise<any>;
};

/**
 * Creates a new Deferred object
 * @see [Deferred | MDN]{@link https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred}
 * @since 0.1.0
 */
export default function Deferred(onResolved = identity, onRejected?: () => any): deferred {
	let resolve = noop;
	let reject = noop;
	const promise = new Promise((...args) => {
		[resolve, reject] = args;
	}).then(onResolved, onRejected);
	return { resolve, reject, promise };
}
