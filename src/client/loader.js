import Path from 'path';
import Url from 'url';
import { createContext } from 'vm';

import AsyncModule from './async-module';
import ModuleTransport from './module-transport';
import Request from './request';
import Registry from './registry';
import calculatePID from '../lib/helpers/pid';
import defineProperties from '../lib/helpers/defineProperties';
import get from '../lib/helpers/get';
import once from '../lib/helpers/once';
import { isRelativePath } from '../lib/helpers';
import { assembleResourceURL } from '../lib/url-builder';

const ENV = get(process, ['env', 'BUILD_ENV']) || get(process, ['env', 'NODE_ENV']);

function getDefaultExternalRequire(loader) {
	return process.browser
		? // eslint-disable-next-line no-underscore-dangle
		  request => loader._throwNotFound(request)
		: require;
}

export default class RemoteLoader {
	static isExternal(request, parent) {
		return Boolean(parent) && typeof request === 'string' && !parent.manifest.exists(request);
	}

	constructor({
		uri,
		context = createContext(global),
		externalRequire = getDefaultExternalRequire(this),
		forceLoad = ENV === 'development',
		ttl = forceLoad ? 0 : 3e5 /* 5m */,
		registry = new Registry(ttl)
	}) {
		if (!uri) {
			throw new Error('uri is required');
		}

		const { host, protocol, pathname } = Url.parse(uri);
		const request = new Request({ protocol });
		const transport = new ModuleTransport(this);
		const baseURL = defineProperties(
			{ host, protocol, pathname: pathname.replace(/\/$/, '') },
			{
				toString: {
					enumerable: false,
					value: once(() => Url.format(this.baseURL))
				}
			},
			{
				enumerable: true,
				writable: false
			}
		);

		Object.assign(this, { baseURL });

		defineProperties(this, {
			context,
			externalRequire,
			registry,
			transport,
			request
		});
	}

	_throwNotFound = request => {
		const err = new Error(`Cannot find module '${request}'`);
		throw Object.assign(err, { code: 'MODULE_NOT_FOUND' });
	};

	getResourceURLFromID(id, query) {
		return assembleResourceURL(this.baseURL, id, query);
	}

	resolveURL(request, parent, query) {
		const moduleId = this.resolve(request, parent);
		return this.getResourceURLFromID(moduleId, query);
	}

	async fetchManifestJSON(id) {
		const pathname = Path.join(this.baseURL.pathname, 'manifest', id);
		const url = Url.format({ ...this.baseURL, pathname });
		const res = await this.fetch(url);
		if (!res.ok) {
			throw Object.assign(new Error(), await res.json());
		}
		// Link the requested id to the resolved pid
		this.registry.ln(id, Number(res.headers['x-pointer-id']));
		return res.json();
	}

	getManifest(id) {
		return this.transport.getManifestJSON(id) || this.fetchManifestJSON(id);
	}

	async fetch(url, { method = 'GET', ...other } = {}) {
		const res = await this.request(url, { method, ...other });
		const moduleId = res.headers['x-module-id'];
		const pid = Number(res.headers['x-pointer-id']);

		if (res.ok && moduleId) {
			this.registry.ln(moduleId, pid);
		}

		return res;
	}

	getFromContext(pid) {
		return this.context[`pid:${pid}`];
	}

	register({ id, pid, ...other }) {
		const { registry } = this;
		let module = registry.get(pid);
		if (!module) {
			module = new AsyncModule(this, { id, pid, ...other });
			registry.set(pid, module);
			registry.ln(id, pid);
			/**
			 * Link main modules to the default request if it doesn't already exist
			 */
			if (module.isMain && !registry.hasLink('')) {
				registry.ln('', pid);
			}
		}
		return module;
	}

	// eslint-disable-next-line class-methods-use-this
	resolve(request = '', parent) {
		let resolved;
		if (typeof request === 'string') {
			resolved = request.replace(/^\/?:?/, '');
		}
		if (parent) {
			resolved = parent.manifest.getModuleId(request) || request;
		}
		return resolved;
	}

	resolvePid(request, parent) {
		const { registry } = this;
		let resolved;
		if (RemoteLoader.isExternal(request, parent)) {
			if (registry.hasLink(request)) {
				resolved = registry.lookup(request);
			} else {
				resolved = calculatePID(request);
				registry.ln(request, resolved);
			}
		} else {
			resolved = this.resolve(request, parent);
			if (typeof resolved !== 'number') {
				if (parent) {
					resolved = parent.manifest.getPid(resolved);
				} else {
					resolved = registry.lookup(resolved);
				}
			}
		}
		return typeof resolved === 'number' ? resolved : undefined;
	}

	// eslint-disable-next-line class-methods-use-this
	resolveDynamic(request, parent) {
		return isRelativePath(request)
			? `./${Path.normalize(`${parent ? Path.dirname(parent.id) : ''}/${request}`)}`
			: request;
	}

	async ensure(entryModule) {
		const { manifest } = entryModule;
		const moduleIds = Array.from(
			manifest
				.list()
				.reduce((acc, moduleId) => {
					const assetId = manifest.getAssetId(moduleId);
					if (!acc.has(assetId) && !RemoteLoader.isExternal(moduleId, entryModule)) {
						acc.set(assetId, moduleId);
					}
					return acc;
				}, new Map())
				.values()
		);

		await Promise.all(moduleIds.map(id => this.load(id, entryModule)));

		return Promise.all(
			entryModule.manifest
				.list()
				.map(id => RemoteLoader.isExternal(id, entryModule) || this.load(id, entryModule))
		);
	}

	async import(request, parent) {
		/**
		 * Sweep the registry cache on entrypoint requests
		 */
		if (!parent && !this.transport.pending.size) {
			this.registry.sweep();
		}
		const module = await this.load(request);
		if (!module.loaded) {
			await module.load();
		}
		return module.exec();
	}

	async resolveAsync(request, parent) {
		const url = this.resolveURL(request, parent);
		const res = await this.fetch(url, { method: 'HEAD' });
		if (!res.ok) {
			this._throwNotFound(request);
		}
		return {
			moduleId: res.headers['x-module-id'],
			pid: Number(res.headers['x-pointer-id'])
		};
	}

	require(pid, parent) {
		// eslint-disable-next-line no-sync
		const module = this.loadSync(pid, parent);
		if (!module && (!parent || !parent.manifest.excluded(pid))) {
			this._throwNotFound(this.resolve(pid, parent));
		}
		return module && module.exec();
	}

	loadSync(request, parent) {
		const { externalRequire, registry } = this;
		const moduleId = this.resolve(request, parent);
		const pid = this.resolvePid(request, parent);
		let module;
		if (registry.has(pid)) {
			module = registry.get(pid);
		} else if (RemoteLoader.isExternal(moduleId, parent)) {
			module = {
				id: moduleId,
				external: true,
				exec: () => {
					module.exports = externalRequire(moduleId);
					return module.exports;
				}
			};
			registry.set(pid, module);
		}
		return module;
	}

	async load(request = '', parent) {
		/**
		 * IMPORTANT: There is no guarantee that the request will be
		 * resolved to the canonical moduleId if parent is undefined
		 */
		// eslint-disable-next-line no-sync
		let module = this.loadSync(request, parent);
		if (!module) {
			module = await this.transport.initialize(request, parent);
			if (!parent) {
				this.registry.ln(request, module.pid);
			}
			await module.load();
		}
		return module;
	}
}
