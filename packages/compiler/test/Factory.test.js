import assert from 'assert';
import Path from 'path';

import createFactory from '../src/Factory';

const extensions = Object.freeze(['.js', '.jsx']);
const rootDir = Path.resolve(__dirname, '../../../packages/test-package');

describe('Factory', () => {
	it('should memoize by input and base values', async () => {
		const factory = createFactory({ rootDir, extensions });
		const results = await Promise.all([
			factory('./src/styled-components'),
			factory('./styled-components', './src'),
			factory(undefined, './src/styled-components'),
			factory('./src/styled-components', rootDir),
			factory('', Path.join(rootDir, 'src/styled-components')),
			factory(Path.join(rootDir, 'src/styled-components'))
		]);
		const { cache: requestCache } = factory.createRequest;

		results.reduce((prev, next) => {
			assert.notStrictEqual(next, prev);
			assert.notStrictEqual(next.request, prev.request);
			assert.strictEqual(next.resolved, prev.resolved);
			assert.strictEqual(next.resource, prev.resource);
			return next;
		});

		assert.strictEqual([...requestCache.keys()].length, results.length);
	});
});
