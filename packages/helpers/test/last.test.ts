import assert from 'assert';

import { last } from '../src';

describe('last', () => {
	it('should return the last element of an array', () => {
		const array = ['a', 'b', 'c'];
		assert.strictEqual(last(array), 'c');
	});
});
