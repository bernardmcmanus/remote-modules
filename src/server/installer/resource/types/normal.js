import Path from 'path';

import hash from 'object-hash';

import { slugToAbsolutePath } from '../../context';
import { isPrimitive, mapObject, omit, pickBy } from '../../../../lib/helpers';
import { statAsync } from '../../../../lib/helpers/fs';
import defineProperties from '../../../../lib/helpers/defineProperties';
import get from '../../../../lib/helpers/get';
import noop from '../../../../lib/helpers/noop';
import once from '../../../../lib/helpers/once';
import pick from '../../../../lib/helpers/pick';

export default class NormalResource {
	constructor({ ctx, adapter, resourceFactory, contextFactory, bundleFactory, logger, options }) {
		let source;

		defineProperties(this, {
			resourceFactory,
			contextFactory,
			bundleFactory,
			logger,
			options,
			adapter,
			dependencies: new Map(),
			dependents: new Map(),
			requests: new Map(),
			resolverPaths: new Set(),
			async: {
				enumerable: true,
				writable: true
			},
			bundle: {
				writable: true
			},
			dirty: {
				value: false,
				writable: true
			},
			error: {
				writable: true
			},
			getBabelrc: {
				writable: true
			},
			getSourceChecksum: {
				writable: true
			},
			getOptionsChecksum: {
				writable: true
			},
			hydrate: {
				writable: true
			},
			index: {
				enumerable: true,
				writable: true
			},
			loaded: {
				value: false,
				writable: true
			},
			mutations: {
				value: {
					define: {},
					provide: {}
				},
				writable: true
			},
			output: {
				writable: true
			},
			failed: {
				get: () => resourceFactory.failed,
				set: value => {
					// eslint-disable-next-line no-param-reassign
					resourceFactory.failed = value;
				}
			},
			source: {
				get: () => source,
				set: value => {
					if (value !== undefined) {
						source = value;
						this.size = Buffer.byteLength(value);
					}
				}
			},
			isNormal: () => resourceFactory.isNormal(this),
			isExternal: () => resourceFactory.isExternal(this),
			isNull: () => resourceFactory.isNull(this),
			isInstalledPackage: () => contextFactory.isInstalledPackage(this.slug)
		});

		Object.assign(this, pick(ctx, ['error', 'moduleId', 'origin', 'packageId', 'pid', 'slug']));
	}

	size = -1;

	sourceChecksum = null;

	optionsChecksum = null;

	getOptionsChecksum = once(() => {
		const { define, provide } = this.mutations;
		const summableOptions = {
			...this.options,
			define: mapObject(define, (_, key) => this.options.define[key]),
			provide: mapObject(provide, (_, key) => this.options.provide[key])
		};
		return hash(summableOptions, { algorithm: 'md5' });
	});

	getSourceChecksum = once(async () => {
		const stats = await statAsync(this.origin);
		const pickedStats = pick(stats, ['ctime', 'mtime', 'ino', 'size']);
		return hash(pickedStats, { algorithm: 'md5' });
	});

	getBabelrc = once(() => {
		let babelrc = get(this, ['options', 'babel', 'babelrc']);
		if (babelrc !== false && !this.isInstalledPackage()) {
			babelrc = this.contextFactory.safeResolve('.babelrc', this.getOriginDir());
		}
		return babelrc || undefined;
	});

	getBabelOptions = (() => {
		let called;
		return () => {
			// Make sure babel options are only applied once
			const options = called
				? {}
				: {
						extends: this.getBabelrc(),
						...this.options.babel
				  };
			called = true;
			return options;
		};
	})();

	hydrate = once(({ resolverPaths, ...other }) => {
		const source = Array.isArray(other.source) ? Buffer.from(other.source) : other.source;
		const output =
			(Array.isArray(other.output) ? Buffer.from(other.output) : other.output) || source;
		Object.assign(this, omit(other, ['output', 'source', 'requests']), { output, source });
		resolverPaths.forEach(rel => {
			this.resolverPaths.add(Path.join(this.options.rootDir, rel));
		});
		return this;
	});

	isOrphaned() {
		return this.dependents.size === 0 && !this.sameAs(this.resourceFactory());
	}

	/**
	 * Sets whether the resource was requested asynchronously.
	 * True if ALL requests are async, false otherwise.
	 * Can only change from:
	 *	1. undefined => true
	 *	2. undefined => false
	 *	3. true => false
	 */
	setAsync(value) {
		if (this.async === undefined || (this.async && !value)) {
			this.async = Boolean(value);
		}
	}

	addToBundle(id, options) {
		if (get(this, ['bundle', 'id']) !== id) {
			if (this.bundle) {
				this.bundle.delete(this);
			}
			this.bundle = this.bundleFactory(id, {
				options: {
					...this.options,
					...options
				},
				writer: this.adapter.writer
			});
			this.bundle.add(this);
		}
	}

	markDirty(history = new Set([this.pid])) {
		this.dirty = true;
		this.loaded = false;
		this.sourceChecksum = null;
		this.getSourceChecksum.clear();

		if (this.bundle) {
			this.bundle.delete(this);
		}

		this.dependents.forEach(resource => {
			if (!history.has(resource.pid)) {
				history.add(resource.pid);
				resource.markDirty(history);
			}
		});

		this.dependencies.forEach(resource => {
			// eslint-disable-next-line no-param-reassign
			resource.index = undefined;
		});

		this.contextFactory.uncache({ origin: this.origin });
	}

	getResolverPaths() {
		return [this.getOriginDir(), ...this.resolverPaths];
	}

	getMeta() {
		return {
			...pick(this, ['index', 'moduleId', 'pid']),
			outputSlug: this.getOutputSlug(),
			type: this.adapter.outputType
		};
	}

	getOriginDir() {
		return Path.dirname(this.origin);
	}

	getAssetId() {
		return this.bundle ? this.bundle.getAssetId(this) : this.getOutputSlug();
	}

	getOutputSlug() {
		const { adapter, slug } = this;
		const { extension } = adapter.writer;
		const ext = Path.extname(slug);
		return ext && extension && !slug.endsWith(extension) ? `${slug}${extension}` : slug;
	}

	getOutputPath() {
		return slugToAbsolutePath(this.options.outputDir, this.getOutputSlug());
	}

	getOutputDir() {
		return Path.dirname(this.getOutputPath());
	}

	isPristineOptions() {
		return this.optionsChecksum === this.getOptionsChecksum();
	}

	async isPristineSource() {
		return this.sourceChecksum === (await this.getSourceChecksum());
	}

	isPristineSelf() {
		return !this.dirty && this.isPristineOptions() && this.isPristineSource();
	}

	async isPristine() {
		let result;
		for (const resource of [this, ...this.getDeepDependencySet(undefined, true)]) {
			// It turns out this is ~2x faster than Promise.all
			// eslint-disable-next-line no-await-in-loop
			result = await resource.isPristineSelf();
			if (!result) {
				break;
			}
		}
		return result;
	}

	async read() {
		if (!(await this.isPristineSource())) {
			this.source = await this.adapter.reader.apply(this);
		}
		this.sourceChecksum = await this.getSourceChecksum();
	}

	write() {
		return this.bundle.write();
	}

	async runVisitor(name, fn = noop) {
		if (!this.failed) {
			try {
				await this.adapter.runVisitor(this, [name, 'pre']);
				await fn();
				await this.adapter.runVisitor(this, [name, 'post']);
			} catch (err) {
				this.failed = true;
				this.logger.error(`Resource '${this.moduleId}' failed on visitor '${name}'`);
				throw err;
			}
		}
	}

	async traverse(interceptor, history = new Set([this.pid])) {
		const requestProcessors = [];
		let shouldWrite;

		if (!this.bundle) {
			this.addToBundle(this.slug);
		}

		if (await this.isPristine()) {
			this.logger.debug(`Loaded '${this.moduleId}' from cache`);
			this.dependencies.forEach(resource => {
				if (!history.has(resource.pid)) {
					history.add(resource.pid);
					requestProcessors.push(() => resource.traverse(interceptor, history));
				}
			});
			// eslint-disable-next-line no-cond-assign
		} else if ((shouldWrite = await interceptor(this))) {
			const { adapter } = this;

			this.logger.info(`Traverse '${this.moduleId}'`);
			this.optionsChecksum = this.getOptionsChecksum();

			await this.runVisitor('Read', () => this.read());

			this.output = this.source;

			await this.runVisitor('Parse', () => {
				adapter.parser.load(this.output, this.slug, this.options.rootDir);
			});

			await this.runVisitor('Requests', async () => {
				const removedDependencies = new Map([...this.dependencies]);
				this.dependencies.clear();
				this.requests.clear();
				adapter.parser.getRequests();
				adapter.parser.requests.forEach(requestObject => {
					const resource = this.resourceFactory(requestObject, this);
					this.addDependency(requestObject, resource);
					if (!history.has(resource.pid)) {
						history.add(resource.pid);
						requestProcessors.push(() => resource.traverse(interceptor, history));
					}
					removedDependencies.delete(resource.pid);
				});
				// Clean up removed resource dependents
				removedDependencies.forEach(resource => {
					this.removeDependency(resource);
				});
			});

			await this.runVisitor('Generate', () => {
				this.generate();
			});

			this.output = adapter.parser.output;
		}

		if (requestProcessors.length) {
			await Promise.all(requestProcessors.map(fn => fn()));
		}

		this.loaded = true;
		this.dirty = false;

		if (shouldWrite) {
			await this.runVisitor('Write', () => this.write());
		}
	}

	applyMutations() {
		// Reset mutations objects
		this.mutations.define = {};
		this.mutations.provide = {};

		Object.entries(this.options.define).forEach(([key, value]) => {
			this.define(key, value);
		});

		Object.entries(this.options.provide).forEach(([key, value]) => {
			this.provide(key, value);
		});

		this.getOptionsChecksum.clear();
		this.optionsChecksum = this.getOptionsChecksum();
	}

	define(key, value) {
		const query = `
			// Program [(
				// ${this.adapter.parser.buildQuery(key)}
			) && !((
				// AssignmentExpression [
					/:left ${this.adapter.parser.buildQuery(key)}
				]
			) || (
				// ImportDeclaration // ${this.adapter.parser.buildQuery(key)}
			) || ${
				// FIXME: why doesn't this work without '... || false'?
				false
			})]
		`;
		if (this.adapter.parser.hasNode(query)) {
			this.mutations.define[key] = value;
		}
	}

	provide(key, value) {
		const { adapter, mutations } = this;
		// Make sure the provide key is referenced but not declared or assigned
		const query = `
			// Program [(
				// ${adapter.parser.buildQuery(key)}
			) && !((
				// VariableDeclarator [
					/:id ${adapter.parser.buildQuery(key)}
				]
			) || (
				// FunctionDeclaration [
					/:id ${adapter.parser.buildQuery(key)}
				]
			) || (
				// AssignmentExpression [
					/:left ${adapter.parser.buildQuery(key)}
				]
			) || (
				// ImportDeclaration // ${adapter.parser.buildQuery(key)}
			))]
		`;
		if (adapter.parser.hasNode(query)) {
			const ast = adapter.parser.parse(String(value), {
				allowImportExportEverywhere: true,
				allowReturnOutsideFunction: true,
				allowSuperOutsideMethod: true
			});
			const [importDeclaration] = adapter.parser.runQuery('// ImportDeclaration', ast);
			if (importDeclaration && !this.sameAs(importDeclaration.source.value)) {
				mutations.provide[key] = defineProperties(importDeclaration, {
					toJSON: () => value
				});
			} else {
				mutations.provide[key] = String(value);
			}
		}
	}

	transform(options) {
		return this.adapter.parser.transform(this, options);
	}

	generate(options) {
		return this.adapter.parser.generate(this, options);
	}

	compress(options) {
		return this.adapter.parser.compress(this, options);
	}

	addDependency(requestObject, resource) {
		const { dependencies, requests } = this;
		if (!requests.has(requestObject.value)) {
			requests.set(requestObject.value, { ...requestObject, pid: resource.pid });
		}
		if (!dependencies.has(resource.pid)) {
			dependencies.set(resource.pid, resource);
		}
		if (!resource.dependents.has(this.pid)) {
			resource.dependents.set(this.pid, this);
		}
	}

	removeDependency(resource) {
		resource.dependents.delete(this.pid);
		if (resource.isOrphaned()) {
			if (this.bundle) {
				this.bundle.delete(resource);
			}
			resource.dependencies.forEach(dependency => {
				resource.removeDependency(dependency);
			});
		}
	}

	sameAs(request) {
		return Boolean(request && this.resourceFactory(request, this).pid === this.pid);
	}

	dependencyOf(request, history = new Set([this.pid])) {
		const resource = this.resourceFactory(request, this);
		let result = this.dependents.has(resource.pid);
		if (!result) {
			for (const [, dependent] of this.dependents) {
				if (!history.has(dependent.pid)) {
					history.add(dependent.pid);
					result = dependent.dependencyOf(resource, history);
					if (result) {
						break;
					}
				}
			}
		}
		return result;
	}

	getDeepDependencySet(filter, dangerous, acc = new Set()) {
		if (!dangerous && !this.loaded) {
			throw new Error('Cannot guarantee a full dependency set before the entire tree is loaded');
		}
		const childDependencyGetters = [];
		for (const [, request] of this.requests) {
			const resource = this.dependencies.get(request.pid);
			if (!filter || filter(resource, request)) {
				if (acc.has(resource)) {
					acc.delete(resource);
				} else {
					childDependencyGetters.push(() => resource.getDeepDependencySet(filter, dangerous, acc));
				}
				acc.add(resource);
			}
		}
		for (const fn of childDependencyGetters) {
			fn();
		}
		return acc;
	}

	getDependenciesByRequest(filter = () => true) {
		const resources = new Map();
		for (const [, request] of this.requests) {
			const resource = this.dependencies.get(request.pid);
			if (filter(resource)) {
				resources.set(request.value, resource);
			}
		}
		return resources;
	}

	getRequestMap(filter) {
		const requestMap = this.getDependenciesByRequest(filter);
		for (const [key, resource] of requestMap) {
			switch (true) {
				case resource.isExternal():
					requestMap.set(key, resource.moduleId);
					break;
				case resource.isNull():
					requestMap.set(key, null);
					break;
				default:
					requestMap.set(key, resource.pid);
					break;
			}
		}
		return requestMap;
	}

	toJSON() {
		const { contextFactory, mutations, resolverPaths } = this;
		const requests = [...this.requests.values()].map(req => pick(req, ['value', 'async']));
		const source = Buffer.isBuffer(this.source) ? Array.from(this.source) : this.source;
		const output =
			(this.output !== this.source &&
				(Buffer.isBuffer(this.output) ? Array.from(this.output) : this.output)) ||
			undefined;
		return {
			...pickBy(this, isPrimitive),
			origin: undefined,
			resolverPaths: [...resolverPaths].map(dir => contextFactory.getSlug(dir)),
			mutations,
			requests,
			source,
			output
		};
	}
}
