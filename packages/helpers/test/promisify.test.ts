import assert from 'assert';

import sinon from 'sinon';

import { promisify } from '../src';
import { NodeCallback } from '../types';

describe('promisify', () => {
	it('should wrap a function that accepts a node-style callback', async () => {
		const spy = sinon.spy((input: any, cb: NodeCallback) => {
			setTimeout(() => {
				cb(null, input);
			}, 0);
		});
		const wrapped = promisify(spy);
		assert.strictEqual(await wrapped('test'), 'test');
		assert.strictEqual(spy.callCount, 1);
	});

	it('should return a rejected promise when callback is called with error', async () => {
		const error = new Error('test');
		const spy = sinon.spy((input: any, cb: NodeCallback) => {
			setTimeout(() => {
				cb(error, input);
			}, 0);
		});

		const wrapped = promisify(spy);

		try {
			await wrapped('test');
		} catch (err) {
			assert.strictEqual(err, error);
		}

		assert.strictEqual(spy.callCount, 1);
	});

	it('should accept a default arguments object', async () => {
		const spy = sinon.spy((a: any, b: any, cb: NodeCallback) => {
			setTimeout(() => {
				cb(null, b);
			}, 0);
		});
		const wrapped = promisify(spy, undefined, {
			defaults: { 1: 'test' }
		});
		assert.strictEqual(await wrapped(), 'test');
		assert.strictEqual(spy.callCount, 1);
	});

	it('should accept an xargs function', async () => {
		const spy = sinon.spy((input: Error, cb: NodeCallback) => {
			setTimeout(() => {
				cb(input);
			}, 0);
		});
		const wrapped = promisify(spy, undefined, {
			// without this wrapped would return a rejected promise
			xargs: ([err]) => [null, err]
		});
		const error = new Error('test');
		assert.strictEqual(await wrapped(error), error);
		assert.strictEqual(spy.callCount, 1);
	});
});
