import Path from 'path';

import noop from '../../lib/helpers/noop';
import logger from '../../lib/logger';
import ConfigStore from '../../lib/config-store';
import ResourceFactory from './resource';

export default function Installer(options) {
	const C = ConfigStore.from(options);
	const scopeLogger = logger.child({ name: C.scopeKey });
	const factory = new ResourceFactory(Object.assign(C, { logger: scopeLogger }));

	return async function install(force, interceptor = noop) {
		const profileEnd = scopeLogger.profile();
		const label = Path.basename(Path.resolve(C.entry));
		let entrypoint;

		scopeLogger.info(`Installing '${label}'...`);

		factory.failed = false;

		try {
			if (force) {
				await factory.reset();
			}

			entrypoint = await factory.load();

			const changedResources = [];

			await entrypoint.traverse(async resource => {
				const result = (await interceptor(resource)) !== false;
				if (result) {
					changedResources.push(resource);
				}
				return result;
			});

			if (!/node_modules\//.test(__dirname)) {
				const resourceIndices = new Map();
				[entrypoint, ...entrypoint.getDeepDependencySet()].forEach(resource => {
					if (
						resourceIndices.has(resource.index) &&
						resourceIndices.get(resource.index) !== resource
					) {
						const err = new Error(
							`Index collision (${resource.index}): '${
								resourceIndices.get(resource.index).moduleId
							}' and '${resource.moduleId}'`
						);
						if (C.env === 'test') {
							throw err;
						} else {
							scopeLogger.warn(err);
						}
					}
					resourceIndices.set(resource.index, resource);
				});
			}

			await Promise.all([
				...changedResources.map(resource => resource.runVisitor('Complete')),
				factory.save()
			]);

			profileEnd(`Sucessfully installed '${label}'`);
		} catch (err) {
			if (!force && !err.frame) {
				err.message = [
					'\n\nAn error occurred while installing from cache.',
					'\nTry re-running your command with the --force flag.',
					`\n\n${err.message}`
				].join('');
			}
			throw err;
		} finally {
			// cleanup?
		}

		return entrypoint;
	};
}
