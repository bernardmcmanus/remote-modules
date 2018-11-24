import assert from 'assert';

import { defineProperties } from '../src';

describe('defineProperties', () => {
	it('should define properties on an object or function (non-enumerable by default)', () => {
		const o = defineProperties({}, { foo: 'bar' });
		const f = defineProperties(() => {}, { foo: 'bar' });

		assert.strictEqual(o.foo, 'bar');
		assert.strictEqual(f.foo, 'bar');

		assert(!Object.keys(o).includes('foo'), 'Expected keys of object to not include foo');
		assert(!Object.keys(f).includes('foo'), 'Expected keys of function to not include foo');
	});

	it('should support passing an object of values or descriptors', () => {
		const input = { a: 'a' };
		const target = defineProperties(input, {
			b: 'b',
			c: {
				value: 'c'
			},
			d: {
				get: () => 'd'
			}
		});

		assert.strictEqual(target.a, 'a');
		assert.strictEqual(target.b, 'b');
		assert.strictEqual(target.c, 'c');
		assert.strictEqual(target.d, 'd');
	});

	it('should accept a descriptor defaults object', () => {
		const target = defineProperties({}, { foo: 'bar' }, { enumerable: true });
		assert.strictEqual(target.foo, 'bar');
		assert(Object.keys(target).includes('foo'), 'Expected keys of object to include foo');
	});
});
