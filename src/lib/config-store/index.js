import Path from 'path';
import Url from 'url';
import fs from 'fs';

import glob from 'glob';
import browserShims from 'node-libs-browser';
import cloneDeep from 'clone-deep';
import merge from 'deepmerge';
import babelMerge from 'babel-merge';

import { resolveSync } from '../resolver';
import { isPlainObject, mapObject, omit, pickDefined } from '../helpers';
import get from '../helpers/get';
import once from '../helpers/once';
import pick from '../helpers/pick';
import defineProperties from '../helpers/defineProperties';
import getCalculated from './calculated';
import getDefaults from './defaults';
import getPreset from './presets';
import * as middleware from './middleware';

import ScriptAdapter from '../../server/installer/resource/adapters/default';
import JSONAdapter from '../../server/installer/resource/adapters/json';
import LESSAdapter from '../../server/installer/resource/adapters/less';
import SASSAdapter from '../../server/installer/resource/adapters/sass';
import CSSAdapter from '../../server/installer/resource/adapters/css';
import RawAdapter from '../../server/installer/resource/adapters/raw';

export default class ConfigStore {
	static getCalculated = getCalculated;

	static getDefaults = getDefaults;

	static getPreset = getPreset;

	static middleware = middleware;

	static defaultScope = ConfigStore.symbolFor('default');

	static getEnv = once(() => {
		const {
			env: { BUILD_ENV, NODE_ENV }
		} = process;
		return BUILD_ENV || NODE_ENV || 'development';
	});

	static adapters = {
		ScriptAdapter,
		JSONAdapter,
		SASSAdapter,
		LESSAdapter,
		CSSAdapter,
		RawAdapter
	};

	static shims = mapObject(
		browserShims,
		path => (path ? Path.relative(Path.resolve('node_modules'), path) : null)
	);

	static mocks = {
		buffer: 'node-libs-browser/mock/buffer.js'
	};

	static symbolFor(value = ConfigStore.defaultScope) {
		return typeof value === 'symbol' ? value : Symbol.for(`@${value.replace(/^@/, '')}`);
	}

	static symbolOf(value = ConfigStore.defaultScope) {
		return typeof value === 'symbol' ? Symbol.keyFor(value) : value.replace(/^@/, '');
	}

	static from(target = {}) {
		let C;
		if (target instanceof ConfigStore) {
			C = target;
		} else {
			C = new ConfigStore(target);
		}
		return C;
	}

	static getModulerc(path) {
		// eslint-disable-next-line global-require, import/no-dynamic-require
		const modulerc = require(path);
		const result = get(modulerc, ['default']) || modulerc;
		return typeof result === 'function'
			? result({
					...middleware,
					...ConfigStore.adapters,
					Scope: ConfigStore.symbolFor,
					Shim: key => {
						if (!Object.hasOwnProperty.call(ConfigStore.shims, key)) {
							throw new Error(`Missing shim '${key}'`);
						}
						return ConfigStore.shims[key];
					}
			  })
			: result;
	}

	static loadrcFile(opts) {
		let result = {};
		if (typeof opts.root === 'string' && typeof opts.config === 'string') {
			try {
				const rcpath = resolveSync(opts.config, {
					baseDir: opts.root,
					extensions: ['.js', '.mjs', '.es', '.es6', '.babel.js', '.json']
				});
				if (rcpath) {
					result = Object.assign(ConfigStore.getModulerc(rcpath), { rcpath });
				}
			} catch (err) {
				if (err.code !== 'MODULE_NOT_FOUND') {
					throw err;
				}
			}
		}
		return result;
	}

	static getEntryDir(rootDir, entry) {
		let result = Path.resolve(rootDir, entry);
		try {
			// eslint-disable-next-line no-sync
			const stats = fs.statSync(result);
			if (!stats.isDirectory()) {
				result = Path.dirname(result);
			}
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
			result = ConfigStore.getEntryDir(rootDir, Path.dirname(entry));
		}
		return result;
	}

	static getMergedOpts(inputOpts = {}, scopeOpts = {}) {
		const defaults = getDefaults();
		const modulerc = ConfigStore.loadrcFile({ ...defaults, ...inputOpts });
		const presetOpts = getPreset(inputOpts.preset || scopeOpts.preset || modulerc.preset);
		const mergeValues = [
			defaults,
			presetOpts,
			modulerc,
			scopeOpts,
			inputOpts,
			get(modulerc, [scopeOpts.scope]),
			get(inputOpts, [scopeOpts.scope])
		].filter(Boolean);

		const mergedOpts = merge.all(mergeValues.map(obj => pickDefined(omit(obj, ['babel']))), {
			arrayMerge: (prev, next) =>
				Array.from(new Set([...Array.from(next || []), ...Array.from(prev || [])])),
			isMergeableObject: value => isPlainObject(value) || Array.isArray(value)
		});

		if (mergedOpts.scope) {
			const scopeKey = ConfigStore.symbolOf(mergedOpts.scope);
			const {
				output,
				server: { uri }
			} = mergedOpts;
			const { host, protocol, ...other } = Url.parse(uri);
			const pathname = Path.join(other.pathname, scopeKey);
			Object.assign(mergedOpts, {
				output: Path.join(output, scopeKey),
				server: {
					...mergedOpts.server,
					uri: Url.format({ host, protocol, pathname })
				}
			});
		} else {
			let scopes = [
				...Object.getOwnPropertySymbols(inputOpts),
				...Object.getOwnPropertySymbols(modulerc)
			];
			if (!scopes.length) {
				scopes = [ConfigStore.defaultScope];
			}
			scopes.forEach(scope => {
				mergedOpts[scope] = { ...modulerc[scope], ...inputOpts[scope], scope };
			});
		}

		const root = Path.normalize(mergedOpts.root);
		const output = Path.normalize(mergedOpts.output);
		const entry = Path.normalize(mergedOpts.entry);
		const rootDir = Path.resolve(root);
		const outputDir = Path.resolve(output);
		const entryDir = ConfigStore.getEntryDir(rootDir, entry);

		Object.assign(mergedOpts, { root, output, entry, rootDir, outputDir, entryDir });

		// Babel config
		mergedOpts.babel = babelMerge.all(mergeValues.map(({ babel }) => babel));

		// include globs
		mergedOpts.include = mergedOpts.include.reduce((acc, include) => {
			if (glob.hasMagic(include)) {
				acc.push(
					...glob
						.sync(include, { cwd: mergedOpts.rootDir })
						.map(path => Path.resolve(mergedOpts.rootDir, path))
				);
			} else {
				acc.push(include);
			}
			return acc;
		}, []);

		// server.static globs
		mergedOpts.server.static = new Set(
			Array.from(mergedOpts.server.static).reduce(
				(acc, pattern) => [...acc, ...(glob.hasMagic(pattern) ? glob.sync(pattern) : [pattern])],
				[]
			)
		);

		// Remove falsy middleware values
		mergedOpts.middleware = mergedOpts.middleware.filter(Boolean);

		// Calculated properties
		return Object.assign(mergedOpts, getCalculated(mergedOpts));
	}

	constructor(opts, configRoot) {
		ConfigStore.getEnv.clear();

		defineProperties(this, {
			defaults: getDefaults(),
			scopeKey: {
				get: () => this.scope && ConfigStore.symbolOf(this.scope),
				set: () => {},
				enumerable: true
			}
		});

		if (opts) {
			if (configRoot && opts.scope) {
				this.initScope(opts, configRoot);
			} else {
				this.init(opts);
			}
		}
	}

	init(opts) {
		Object.assign(this, ConfigStore.getMergedOpts(opts));
		this.scopes().forEach(scope => {
			Object.assign(this[scope], ConfigStore.getMergedOpts(opts, this[scope]));
		});
		return this;
	}

	initScope(opts, configRoot) {
		Object.assign(this, cloneDeep(opts));
		return defineProperties(this, { configRoot });
	}

	scopes() {
		return this.scope ? [this.scope] : Object.getOwnPropertySymbols(this);
	}

	use(_scope = ConfigStore.defaultScope) {
		const scope = ConfigStore.symbolFor(_scope);
		const scopeObject = scope === this.scope ? this : this[scope];
		if (!scopeObject) {
			throw new Error(`Scope '${ConfigStore.symbolOf(scope)}' does not exist`);
		}
		return new ConfigStore(scopeObject, this.getRoot());
	}

	runMiddleware(type, args) {
		for (const { fn } of this.middleware.filter(m => m.type === type)) {
			// eslint-disable-next-line prefer-spread
			fn.apply(null, args);
		}
	}

	getRoot() {
		return this.configRoot || this;
	}

	get(path) {
		return get(this, path);
	}

	pick(keys) {
		return pick(this, keys);
	}
}
