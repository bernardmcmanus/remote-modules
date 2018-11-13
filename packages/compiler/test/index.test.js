import assert from 'assert';

import Compiler from '../src';

describe.skip('Compiler', () => {
	describe('run', () => {
		it('should visit each resource exactly once during a fresh compilation', async () => {
			const compiler = new Compiler();
			const visited = new Set();

			compiler.on('resource', resource => {
				assert(!visited.has(resource.id), `Expected ${resource.id} to be visited only once`);
				visited.add(resource.pid);
			});

			await compiler.run();
		});
	});
});
