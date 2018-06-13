import noop from '../../lib/helpers/noop';

export default class ModuleTransport {
	constructor(loader) {
		this.loader = loader;
	}

	pending = new Map();

	// eslint-disable-next-line class-methods-use-this
	getManifestJSON() {
		/* noop */
	}

	initialize(request, parent) {
		const { loader, pending } = this;
		if (!pending.has(request)) {
			pending.set(
				request,
				new Promise(async (resolve, reject) => {
					try {
						let pid = loader.resolvePid(request, parent);
						let moduleId = loader.resolve(request, parent);
						let module;

						if (loader.getFromContext(pid)) {
							module = loader.register({ content: 'this;', id: moduleId, pid, parent });
						} else {
							const url = loader.getResourceURL(request, parent);
							const res = await loader.fetch(url);
							if (res.ok) {
								moduleId = res.headers['x-module-id'];
								pid = Number(res.headers['x-pointer-id']);
								module = loader.register({ content: await res.text(), id: moduleId, pid, parent });
							} else {
								const { message, ...other } = await res.json();
								const messageWithContext = parent ? `${message}${parent.trace()}` : message;
								throw Object.assign(new Error(messageWithContext), other);
							}
						}

						resolve(module);
					} catch (err) {
						reject(err);
					}
				})
			);
			pending
				.get(request)
				.catch(noop)
				.then(() => {
					pending.delete(request);
				});
		}
		return pending.get(request);
	}
}
