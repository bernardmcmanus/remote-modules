import assert from 'assert';

import { pickBy } from '../src';

const dummyPredicate = () => true;

describe('pickBy', () => {
	it('should pick properties based on the return values of predicate function', () => {
		const output = pickBy(
			{
				a: 0,
				b: 1,
				c: 2
			},
			Boolean
		);
		assert.deepEqual(output, { b: 1, c: 2 });
	});

	it('should handle non-pickable input', () => {
		const array: any[] = [];
		const fn = () => {};
		assert.strictEqual(pickBy(undefined, dummyPredicate), undefined);
		assert.strictEqual(pickBy(null, dummyPredicate), null);
		assert.strictEqual(pickBy(false, dummyPredicate), false);
		assert.strictEqual(pickBy('test', dummyPredicate), 'test');
		assert.strictEqual(pickBy(array, dummyPredicate), array);
		assert.strictEqual(pickBy(fn, dummyPredicate), fn);
	});
});
