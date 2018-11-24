import assert from 'assert';

import sinon from 'sinon';

import { memoize, pick } from '../src';
import { ObjectMap } from '../types';

function random(n: number = 1e6) {
	return Math.round(Math.random() * n);
}

describe('memoize', () => {
	it('should memoize a function by arguments', () => {
		const spy = sinon.spy(random);
		const f = memoize(spy);
		let result = f();

		assert.strictEqual(f(), result);
		assert.notStrictEqual(f(100), result);

		result = f(200);
		assert.strictEqual(f(200), result);
		assert.notStrictEqual(f(300), result);

		assert.strictEqual(spy.callCount, 4);
	});

	it('should use Map as the default cache', () => {
		const f = memoize(random);
		assert(f.cache instanceof Map, 'Expected cache to be an instance of Map');
	});

	it('should accept a resolver function', () => {
		const f = memoize(([a, b]: number[]) => random(b), ([a, b]: number[]) => b);
		let result = f([]);

		assert.strictEqual(f([]), result);
		assert.notStrictEqual(f([0, 100]), result);

		result = f([100, 200]);
		assert.strictEqual(f([100, 200]), result);
		assert.notStrictEqual(f([200, 300]), result);
	});

	it('should support a WeakMap cache', () => {
		type arg = ObjectMap<number>;

		const arg1: arg = {};
		const arg2: arg = { value: 100 };

		const f = memoize(({ value }: arg) => random(value), undefined, new WeakMap());

		const result = f(arg1);

		assert.strictEqual(f(arg1), result);
		assert.strictEqual(f(Object.assign(arg1, arg2)), result);
		assert.notStrictEqual(f(arg2), result);
	});

	it('should memoize thrown errors', () => {
		const error = new TypeError('test');
		const predicate = pick(error, ['name', 'message', 'stack']);
		const spy = sinon.spy(() => {
			throw error;
		});
		const f = memoize(spy);

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
