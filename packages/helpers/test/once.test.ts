import assert from 'assert';

import sinon from 'sinon';

import { once, pick } from '../src';

function random(n: number = 1e6) {
	return Math.round(Math.random() * n);
}

describe('once', () => {
	it('should cache the first return value of fn', () => {
		const spy = sinon.spy(random);
		const f = once(spy);
		const result = f();

		assert.strictEqual(f(), result);
		assert.strictEqual(f(100), result);
		assert.strictEqual(f(200), result);
		assert.strictEqual(spy.callCount, 1);
	});

	it('should expose a clear method', () => {
		const spy = sinon.spy(random);
		const f = once(spy);
		let result = f();

		assert.strictEqual(f(), result);
		assert.strictEqual(f(100), result);

		f.clear();
		result = f(100);

		assert.strictEqual(f(), result);
		assert.strictEqual(f(100), result);

		assert.strictEqual(spy.callCount, 2);
	});

	it('should cache thrown errors', () => {
		const error = new TypeError('test');
		const predicate = pick(error, ['name', 'message', 'stack']);
		const spy = sinon.spy(() => {
			throw error;
		});
		const f = once(spy);

		assert.throws(f, predicate);
		assert.throws(f, predicate);

		try {
			f();
		} catch (err) {
			assert.strictEqual(err, error);
		}

		assert.strictEqual(spy.callCount, 1);
	});
});
