import assert from 'assert';

import sinon from 'sinon';

import { Deferred } from '../src';

describe('Deferred', () => {
	it('should create a deferred object', async () => {
		const deferred = Deferred();

		assert.strictEqual(typeof deferred.resolve, 'function');
		assert.strictEqual(typeof deferred.reject, 'function');
		assert(deferred.promise instanceof Promise, 'Expected deferred.promise to be a promise');

		deferred.resolve(1);

		assert.strictEqual(await deferred.promise, 1);
	});

	it('should accept an onResolved hook', async () => {
		const deferred = Deferred(value => value * 2);
		deferred.resolve(1);
		assert.strictEqual(await deferred.promise, 2);
	});

	it('should accept an onRejected hook', async () => {
		const spy = sinon.spy();
		const deferred = Deferred(undefined, spy);
		deferred.reject();
		await deferred.promise;
		assert.strictEqual(spy.callCount, 1);
	});
});
