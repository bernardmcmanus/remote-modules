import assert from 'assert';
import Path from 'path';

import Resolver from '../src/Resolver';
import Request from '../src/Request';
import RequestContext from '../src/RequestContext';

const extensions = Object.freeze(['.js', '.jsx']);
const rootDir = Path.resolve(__dirname, '../../../packages/test-package');

describe('RequestContext', () => {
	describe('resolveSync', () => {
		it('should synchronously resolve a request', () => {
			const request = new Request('./src/styled-components', rootDir);
			const resolver = new Resolver({ rootDir, extensions });
			const ctx = new RequestContext({ request, resolver });
			ctx.resolveSync();
			assert.strictEqual(ctx.resolved, Path.join(rootDir, request.pathname, 'index.jsx'));
		});
	});

	describe('resolveAsync', () => {
		it('should asynchronously resolve a request', async () => {
			const request = new Request('./src/styled-components', rootDir);
			const resolver = new Resolver({ rootDir, extensions });
			const ctx = new RequestContext({ request, resolver });
			await ctx.resolveAsync();
			assert.strictEqual(ctx.resolved, Path.join(rootDir, request.pathname, 'index.jsx'));
		});
	});
});
