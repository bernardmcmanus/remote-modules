import Path from 'path';

import bigInt from 'big-integer';

import {
	mkdirpAsync,
	rimrafAsync,
	readJSONAsync,
	writeJSONAsync,
	writeFileAsync
} from '../../../lib/helpers/fs';
import { omit, matches } from '../../../lib/helpers';
import defineProperties from '../../../lib/helpers/defineProperties';
import get from '../../../lib/helpers/get';
import memoize from '../../../lib/helpers/memoize';
import once from '../../../lib/helpers/once';
import pick from '../../../lib/helpers/pick';
import ConfigStore from '../../../lib/config-store';
import Manifest from '../../../lib/manifest';
import NormalResource from './types/normal';
import NullResource from './types/null';
import ExternalResource from './types/external';
import ContextFactory, { getManifestPath } from '../context';
import BundleFactory from '../bundle';
import manifestGenerator from '../generators/manifest';
import { getAdapter } from './adapters';

import { version as packageVersion } from '../../../../package.json';

export function isNormal(resource) {
	return Boolean(resource) && resource.constructor === NormalResource;
}

export function isNull(resource) {
	return Boolean(resource) && resource.constructor === NullResource;
}

export function isExternal(resource) {
	return Boolean(resource) && resource.constructor === ExternalResource;
}

export function isResource(value) {
	return isNormal(value) || isNull(value) || isExternal(value);
}

export default function ResourceFactory(options) {
	const contextFactory = new ContextFactory(options);
	const bundleFactory = new BundleFactory(options);
	const C = ConfigStore.from(options);
	const outputPath = Path.join(C.outputDir, '.__resources__.json');
	const { logger } = C;

	const readPackage = memoize(async resource => {
		const { resolved } = contextFactory('package.json', resource.getResolverPaths());
		const pkg = await readJSONAsync(resolved);
		return pick(pkg, [...C.mainFields, 'version']);
	}, resource => resource.packageId);

	const createResource = memoize(ctx => {
		const adapter = getAdapter(C, ctx);
		const resourceOpts = {
			ctx,
			adapter,
			logger,
			contextFactory,
			bundleFactory,
			// eslint-disable-next-line no-use-before-define
			resourceFactory: factory,
			options: omit(C, ['logger'])
		};
		let resource;
		switch (true) {
			case ctx.isExternal():
				resource = new ExternalResource(resourceOpts);
				break;
			case ctx.isNull():
				resource = new NullResource(resourceOpts);
				break;
			default:
				resource = new NormalResource(resourceOpts);
				break;
		}
		return resource;
	}, ctx => `${ctx.origin}:${ctx.resolved}`);

	const applyRequestContext = memoize(({ ctx, parent, resource }) => {
		// Set async and run resource middleware once per context
		resource.setAsync(ctx.async || (parent && parent.async));
		C.runMiddleware('resource', [resource, ctx]);
	}, ({ ctx }) => ctx);

	async function generateManifest(resource) {
		const deepDependencySet = resource.getDeepDependencySet(
			(dependency, request) => !request.async && dependency.isNormal()
		);
		const meta = resource.getMeta();
		const packages = {
			[resource.packageId]: await readPackage(resource)
		};
		const deepDependencyArray = await Promise.all(
			[...deepDependencySet]
				.sort((a, b) => bigInt(b.index).compare(bigInt(a.index)))
				.map(async dependency => {
					if (!packages[dependency.packageId]) {
						packages[dependency.packageId] = await readPackage(dependency);
					}
					return dependency.getMeta();
				})
		);

		// Make sure packages are sorted alphabetically
		Object.keys(packages)
			.sort((a, b) => a.localeCompare(b))
			.forEach(key => {
				const value = packages[key];
				delete packages[key];
				packages[key] = value;
			});

		const manifest = new Manifest(deepDependencyArray, { meta, packages });
		const manifestPath = getManifestPath(resource.getOutputPath());
		await mkdirpAsync(resource.getOutputDir());
		return writeFileAsync(manifestPath, manifestGenerator(manifest));
	}

	async function getResourceJSON() {
		let json;
		try {
			json = await readJSONAsync(outputPath);
			// FIXME: Check semver range or use a dedicated cachefile version
			if (json.version !== packageVersion) {
				json = null;
			}
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
		}
		return json || { map: {}, cache: [] };
	}

	function getResourceIndex(ctx, parent) {
		const requestIndex = parent
			? parent.adapter.parser.requests.findIndex(({ value }) => value === ctx.originalRequest)
			: 0;
		return requestIndex < 0 ? undefined : `${get(parent, ['index']) || 1}0${requestIndex}`;
	}

	function factory(request = C.entry, parent) {
		let resource;
		let ctx;

		if (isResource(request)) {
			resource = request;
			ctx = contextFactory(resource.origin, parent && parent.getResolverPaths());
		} else {
			ctx = contextFactory(request, parent && parent.getResolverPaths());
			resource = createResource(ctx);
		}

		if (!resource.index) {
			resource.index = getResourceIndex(ctx, parent);
		}

		applyRequestContext({ ctx, parent, resource });

		return resource;
	}

	return defineProperties(factory, {
		name: 'ResourceFactory',
		outputPath,
		getResourceIndex,
		getResourceJSON,
		generateManifest,
		readPackage,
		isResource,
		isNormal,
		isNull,
		isExternal,
		contextFactory,
		bundleFactory,
		failed: {
			value: false,
			writable: true
		},
		load: once(async () => {
			const { cache } = await getResourceJSON();
			return cache.length ? factory.import(cache) : factory();
		}),
		import(exportJSON) {
			const resourceDataByModuleId = new Map();
			const hydratedResources = new Set();
			const missingRequests = new Set();
			const requestProcessors = [];

			exportJSON.forEach(data => {
				const { moduleId, slug, requests } = data;
				const origin = contextFactory.safeResolve(slug);
				const baseDir = origin && Path.isAbsolute(origin) ? Path.dirname(origin) : undefined;

				// The first element in exportJSON is the entrypoint
				if (data === exportJSON[0]) {
					const ctx = contextFactory(C.entry);
					// Make sure the cached entrypoint is the same as the resolved entrypoint
					if (moduleId === ctx.moduleId) {
						const resource = createResource(ctx).hydrate(data);
						hydratedResources.add(resource);
					} else {
						exportJSON.forEach(obj => {
							// eslint-disable-next-line no-param-reassign
							obj.index = undefined;
						});
					}
				}

				resourceDataByModuleId.set(moduleId, data);

				requestProcessors.push(() => {
					// Iterate over each resource's requests array
					requests.forEach(requestObject => {
						// Recreate and hydrate each dependency resource using the original request context
						const ctx = contextFactory(requestObject, [baseDir]);
						const resourceJSON = resourceDataByModuleId.get(ctx.moduleId);
						if (resourceJSON) {
							const resource = createResource(ctx).hydrate(resourceJSON);
							hydratedResources.add(resource);
						} else {
							missingRequests.add(requestObject);
						}
					});
				});
			});

			// Process the requests for each resource
			requestProcessors.forEach(fn => fn());

			// Rebuild the dependency graph
			hydratedResources.forEach(resource => {
				if (resourceDataByModuleId.has(resource.moduleId)) {
					const { requests } = resourceDataByModuleId.get(resource.moduleId);
					requests.forEach(requestObject => {
						const dependency = factory(requestObject, resource);
						resource.addDependency(requestObject, dependency);
						if (missingRequests.has(requestObject) && dependency.isNull()) {
							resource.markDirty();
						}
					});
				}
			});

			// return the entrypoint
			return factory();
		},
		export() {
			const entrypoint = factory();
			return [entrypoint, ...entrypoint.getDeepDependencySet()].sort((a, b) =>
				bigInt(a.index).compare(bigInt(b.index))
			);
		},
		uncache(query) {
			if (query) {
				for (const [key, resource] of createResource.cache) {
					if (matches(resource, query)) {
						readPackage.cache.delete(readPackage.resolver(resource));
						createResource.cache.delete(key);
					}
				}
			} else {
				bundleFactory.cache.clear();
				readPackage.cache.clear();
				createResource.cache.clear();
				factory.load.clear();
			}
		},
		async save() {
			const resources = factory.export();

			const moduleMap = resources.reduce((acc, resource) => {
				const outputSlug = resource.getOutputSlug();
				if (resource.slug !== outputSlug) {
					acc[resource.slug] = outputSlug;
				}
				return acc;
			}, {});

			const assetMap = resources.reduce((acc, resource) => {
				const outputSlug = resource.getOutputSlug();
				const assetId = resource.getAssetId();
				if (assetId && outputSlug !== assetId) {
					acc[outputSlug] = assetId;
				}
				return acc;
			}, {});

			await mkdirpAsync(C.outputDir);
			await writeJSONAsync(outputPath, {
				version: packageVersion,
				modules: moduleMap,
				assets: assetMap,
				cache: resources
			});
		},
		async reset() {
			contextFactory.uncache();
			factory.uncache();
			await rimrafAsync(C.outputDir);
		}
	});
}
