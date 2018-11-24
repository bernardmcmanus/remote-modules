import assert from 'assert';

import { noop } from '../src';

describe('noop', () => {
	it('should be a noop function', () => {
		assert.strictEqual(noop(), undefined);
	});
});
