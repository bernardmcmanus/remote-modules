import assert from 'assert';
import Path from 'path';

import Request from '../src/Request';

const rootDir = Path.resolve(__dirname, '../../../packages/test-package');

describe('Request', () => {
	it('should parse a resource request', () => {
		const pathname = './src/styled-components';
		const input = `${pathname}?foo=bar&foo=baz`;
		const request = new Request(input, rootDir);
		assert.strictEqual(request.pathname, pathname);
		assert.deepEqual(request.query, { foo: ['bar', 'baz'] });
	});

	it('should require an absolute base path if input is relative', () => {
		const input = './src/styled-components';
		const relativeRootDir = Path.relative(process.cwd(), rootDir);
		assert.throws(() => new Request(input), new RegExp(`Invalid request: ${input}`));
		assert.throws(
			() => new Request(input, relativeRootDir),
			new RegExp(`Invalid request: ${input}`)
		);
	});
});
