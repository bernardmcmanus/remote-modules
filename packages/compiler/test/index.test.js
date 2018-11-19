import assert from 'assert';
import Path from 'path';

import Compiler from '../src';

const rootDir = Path.resolve(__dirname, '../../../packages/test-package');

describe('Compiler', () => {
	describe('run', () => {
		it('should visit each resource exactly once during a fresh compilation', async () => {
			const visited = new Set();
			const compiler = new Compiler({
				root: Path.relative(process.cwd(), rootDir),
				entry: './src/styled-components',
				extensions: ['.js', '.jsx']
			});

			compiler.on('resource', resource => {
				assert(!visited.has(resource.id), `Expected ${resource.id} to be visited only once`);
				visited.add(resource.id);
			});

			await compiler.run(true);
		});
	});
});
