import assert from 'assert';

import { pick } from '../src';

const dummyKeys = Object.freeze([]);

describe('pick', () => {
	it('should pick properties passed in the keys array', () => {
		const output = pick(
			{
				a: 0,
				b: 1,
				c: 2
			},
			['b', 'c']
		);
		assert.deepEqual(output, { b: 1, c: 2 });
	});

	it('should handle non-pickable input', () => {
		const array: any[] = [];
		const fn = () => {};
		assert.strictEqual(pick(undefined, dummyKeys), undefined);
		assert.strictEqual(pick(null, dummyKeys), null);
		assert.strictEqual(pick(false, dummyKeys), false);
		assert.strictEqual(pick('test', dummyKeys), 'test');
		assert.strictEqual(pick(array, dummyKeys), array);
		assert.strictEqual(pick(fn, dummyKeys), fn);
	});
});
