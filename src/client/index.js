import Path from 'path';
import Url from 'url';
import { createContext, isContext } from 'vm';

import { stripBounding } from '../lib/helpers';
import defineProperties from '../lib/helpers/defineProperties';
import escapeRegExp from '../lib/helpers/escapeRegExp';
import RemoteLoader from './loader';

export default class Client {
	static defaultScope = '@default';

	static hasScope(namespace) {
		return /(?:^|.+\/)@.+$/.test(namespace);
	}

	// Matches ^(<(namespace/)?@scope>)?
	static getNamespace(string = '') {
		return stripBounding(string.match(/^(?:<((?:.*\/)?@[^>]+)>)?.*$/)[1] || '', '/');
	}

	// Removes ^(<(namespace/)?@scope>)?
	static transformArgs(ns, [string, ...args]) {
		return [string && string.replace(new RegExp(`^<${escapeRegExp(ns)}>`), ''), ...args];
	}

	constructor({ context, ...other }) {
		defineProperties(this, {
			lastActiveLoader: {
				value: undefined,
				writable: true
			}
		});
		Object.assign(this, {
			options: {
				context: context && (isContext(context) ? context : createContext(context)),
				...other
			}
		});
	}

	loaders = new Map();

	async reset(fn, nextNamespace) {
		const { loaders, lastActiveLoader } = this;
		let result;
		if (lastActiveLoader && lastActiveLoader !== loaders.get(nextNamespace)) {
			this.lastActiveLoader = null;
			result = await lastActiveLoader.reset(fn);
		} else if (fn) {
			result = await fn();
		}
		return result;
	}

	async renderStatic(request, type) {
		const ns = this.getNamespace(request);
		const [moduleId = ''] = Client.transformArgs(ns, [request]);
		const loader = this.use(ns);
		const pathname = Path.join(loader.baseURL.pathname, 'render', moduleId);
		const search = type ? `type=${type}` : '';
		const url = Url.format({ ...loader.baseURL, pathname, search });
		const res = await loader.fetch(url);
		if (!res.ok) {
			throw Object.assign(new Error(), await res.json());
		}
		return res.text();
	}

	getNamespace(string) {
		const ns = Client.getNamespace(string);
		const needsScope = !(Client.hasScope(ns) || Client.hasScope(this.options.uri));
		return needsScope ? stripBounding(`${ns}/${Client.defaultScope}`, '/') : ns;
	}

	use(ns) {
		const { loaders, options } = this;
		let loader;
		if (loaders.has(ns)) {
			loader = loaders.get(ns);
		} else {
			const { uri, ...other } = options;
			loader = new RemoteLoader({
				uri: `${uri.replace(/\/$/, '')}/${ns}`,
				...other
			});
			loaders.set(ns, loader);
		}
		this.lastActiveLoader = loader;
		return loader;
	}

	import(...args) {
		const ns = this.getNamespace(args[0]);
		const xargs = Client.transformArgs(ns, args);
		return this.reset(() => {
			const loader = this.use(ns);
			return loader.import(...xargs);
		}, ns);
	}
}
