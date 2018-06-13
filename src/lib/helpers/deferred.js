import identity from './identity';

/**
 * Creates a new Deferred object
 * @see [Deferred | MDN]{@link https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred}
 * @since 0.1.0
 *
 * @param {function} [onResolved=[identity]{@link module:identity}]
 * @param {function} [onRejected]
 * @return {object}
 */
export default function Deferred(onResolved = identity, onRejected) {
	let resolve;
	let reject;
	const promise = new Promise((...args) => {
		[resolve, reject] = args;
	}).then(onResolved, onRejected);
	return { resolve, reject, promise };
}
