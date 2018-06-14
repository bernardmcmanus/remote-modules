import Path from 'path';
import { Script } from 'vm';

import Manifest from '../lib/manifest';
import defineProperties from '../lib/helpers/defineProperties';
import once from '../lib/helpers/once';

export default class AsyncModule {
	static formatError(err) {
		const stack = err.stack
			.split('\n')
			.filter(line => !/AsyncModule|RemoteLoader/.test(line))
			.join('\n');
		return Object.assign(err, { stack });
	}

	constructor(loader, { id, pid, content, parent = null, ...other }) {
		if (!Path.extname(id)) {
			throw new Error(`Expected AsyncModule '${id}' to have extension`);
		}
		if (typeof pid !== 'number') {
			throw new Error(`Expected AsyncModule '${id}' to have numeric pid`);
		}
		const filename = Path.join('/', id);
		const dirname = Path.dirname(filename);
		const script = new Script(content, {
			// this has no effect on runtime, only stack traces
			filename: loader.getResourceURLFromID(id)
		});
		const main = (parent && parent.main) || parent || this;

		defineProperties(this, {
			loader,
			manifest: {
				value: null,
				writable: true
			},
			isMain: {
				get: () => main === this
			},
			context: {
				get: () => loader.context
			},
			registry: {
				get: () => loader.registry
			},
			require: {
				writable: true
			}
		});

		Object.assign(
			this,
			{
				id,
				pid,
				script,
				filename,
				dirname,
				parent,
				main,
				external: false,
				loaded: false,
				initializer: null,
				exports: {}
			},
			other
		);
	}

	load = once(async () => {
		const { context, script, filename, dirname } = this;
		const namespace = context !== global ? script.runInContext(context) : script.runInThisContext();
		const wrapper = namespace[`pid:${this.pid}`];
		this.initializer = await wrapper(this.exports, this.require, this, filename, dirname);
		this.loaded = true;
		return this;
	});

	require = request => this.loader.require(request, this);

	_throwNotFound(request) {
		// eslint-disable-next-line no-underscore-dangle
		return this.loader._throwNotFound(request);
	}

	import(request) {
		return this.loader.import(request, this);
	}

	resolveDynamic(request) {
		return this.loader.resolveDynamic(request, this);
	}

	resolveURL(request) {
		return this.loader.resolveURL(request, this);
	}

	exec() {
		const { id, initializer, loaded } = this;
		if (!loaded) {
			throw new Error(`Attempted to initialize module ${id} before it was loaded`);
		}
		if (initializer) {
			delete this.initializer;
			try {
				initializer();
			} catch (err) {
				const error = AsyncModule.formatError(err);
				this.initializer = () => {
					throw error;
				};
				this.initializer();
			}
		}
		return this.exports;
	}

	async define(meta, initializer) {
		const { loader } = this;
		if (!this.manifest) {
			if (this.isMain) {
				const json = await loader.getManifest(this.id);
				this.manifest = Manifest.load(json);
				await loader.ensure(this);
			} else {
				this.manifest = Manifest.derive(this.main.manifest, meta);
			}
		}
		return initializer;
	}

	trace() {
		const route = new Set();
		let parent = this;
		while (parent && !route.has(parent.id)) {
			route.add(parent.id);
			({ parent } = parent);
		}
		const indent = ' '.repeat(4);
		return Array.from(route).reduce((acc, id) => `${acc}\n${indent}<AsyncModule (${id})>`, '');
	}
}
