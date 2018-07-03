import Path from 'path';
import Url from 'url';
import { createContext, isContext } from 'vm';

import { stripBounding } from '../lib/helpers';
import defineProperties from '../lib/helpers/defineProperties';
import escapeRegExp from '../lib/helpers/escapeRegExp';
import RemoteLoader from './loader';

export default class Client {
	static defaultScope = '@default';

	static implements = Object.freeze([
		'import',
		'load',
		'loadSync',
		'resolve',
		'resolveAsync',
		'require'
	]);

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
		defineProperties(
			this,
			Client.implements.reduce((acc, method) => {
				acc[method] = (...args) => this.__callLoaderMethod(method, args);
				return acc;
			}, {})
		);
		Object.assign(this, {
			options: {
				context: context && (isContext(context) ? context : createContext(context)),
				...other
			}
		});
	}

	loaders = new Map();

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
		return loader;
	}

	__callLoaderMethod(method, args) {
		const ns = this.getNamespace(args[0]);
		const xargs = Client.transformArgs(ns, args);
		const loader = this.use(ns);
		return loader[method].call(loader, ...xargs);
	}
}
