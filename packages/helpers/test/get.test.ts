import assert from 'assert';

import { get } from '../src';

describe('get', () => {
	it('should return the property at path', () => {
		const target = {
			a: {
				b: {
					c: 'c'
				}
			}
		};
		assert.strictEqual(get(target, ['a', 'b', 'c']), 'c');
	});

	it('should handle falsy paths', () => {
		assert.strictEqual(get({}, ['z', 'b', 'c']), undefined);
	});

	it('should handle falsy targets', () => {
		assert.strictEqual(get(null, ['z', 'b', 'c']), undefined);
	});
});
