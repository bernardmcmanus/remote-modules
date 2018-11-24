import assert from 'assert';

import { identity } from '../src';

describe('identity', () => {
	it('should be an identity function', () => {
		const args = ['a', 'b', 'c'];
		assert.strictEqual(identity(...args), args[0]);
	});
});
