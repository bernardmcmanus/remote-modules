import assert from 'assert';

import sinon from 'sinon';

import { asyncify } from '../src';

describe('asyncify', () => {
	it('should wrap a function with signature (...args, callback)', async () => {
		const spy = sinon.spy((...args: string[]) => {
			assert.deepEqual(args, ['foo', 'bar']);
		});

		const wrapped = asyncify(spy);
		const result = await wrapped(
			'foo',
			'bar',
			() =>
				new Promise(resolve => {
					resolve('test');
				})
		);

		assert.strictEqual(result, 'test');
		assert.strictEqual(spy.callCount, 1);
	});

	it('should return a rejected promise when wrapped function throws an error', async () => {
		const spy = sinon.spy();
		const wrapped = asyncify(spy);
		const error = new Error('test');

		try {
			await wrapped('foo', 'bar', async () => {
				await new Promise(r => setTimeout(r, 0));
				throw error;
			});
		} catch (err) {
			assert.strictEqual(err, error);
		}

		assert.strictEqual(spy.callCount, 1);
	});
});
