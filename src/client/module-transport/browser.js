/* eslint-env browser */

import Manifest from '../../lib/manifest';
import calculatePID from '../../lib/helpers/pid';
import defineProperties from '../../lib/helpers/defineProperties';
import noop from '../../lib/helpers/noop';

function getMainTag(request) {
	const mainTag = document.querySelector(
		'*[data-remote-modules][data-main]:not([data-mark-sweep])'
	);
	return mainTag && (mainTag.getAttribute('data-module-id') || '').includes(request)
		? mainTag
		: null;
}

function getMainModuleId(request) {
	const mainTag = getMainTag(request);
	return (mainTag && mainTag.getAttribute('data-module-id')) || undefined;
}

function getMainPid(request) {
	const mainTag = getMainTag(request);
	return (mainTag && Number(mainTag.getAttribute('data-pid'))) || undefined;
}

function getMainType(request) {
	const mainTag = getMainTag(request);
	return mainTag && (mainTag.tagName === 'LINK' || mainTag.tagName === 'STYLE') ? 'css' : 'js';
}

function getExistingTag(pid) {
	return document.querySelector(`*[data-remote-modules][data-pid="${pid}"]:not([data-mark-sweep])`);
}

export default class ModuleTransport {
	constructor(loader) {
		this.loader = loader;
	}

	pending = defineProperties(
		{},
		{
			size: {
				get: () => Object.keys(this.pending).length
			}
		}
	);

	// eslint-disable-next-line class-methods-use-this
	getResetPredicate() {
		const existing = document.querySelectorAll('*[data-remote-modules]:not([data-mark-sweep])');
		existing.forEach(element => {
			// eslint-disable-next-line no-param-reassign
			element.dataset.markSweep = '';
		});
		return () => {
			existing.forEach(element => {
				element.parentNode.removeChild(element);
			});
		};
	}

	async loadResource(request, parent) {
		const { loader } = this;
		let { moduleId, pid, type } = this.getModuleMeta(request, parent);

		if (!loader.getFromContext(pid)) {
			if (pid) {
				const url = loader.resolveURL(request, parent);
				if (type === 'css') {
					if (!getExistingTag(pid)) {
						await new Promise((resolve, reject) => {
							const link = document.createElement('link');
							link.onload = () => resolve();
							link.onerror = () => reject(new Error(`Failed to load '${url}'`));
							link.rel = 'stylesheet';
							link.href = url;
							link.dataset.pid = pid;
							link.dataset.remoteModules = '';
							document.head.appendChild(link);
						});
					}
				} else {
					await new Promise((resolve, reject) => {
						const script = document.createElement('script');
						script.onload = () => resolve();
						script.onerror = () => reject(new Error(`Failed to load '${url}'`));
						script.src = url;
						script.dataset.pid = pid;
						script.dataset.remoteModules = '';
						document.head.appendChild(script);
					});
				}
			} else {
				await Promise.all([
					this.getManifestJSON(request).then(manifestJSON => {
						const script = document.createElement('script');
						script.type = 'application/json';
						script.dataset.moduleId = manifestJSON.meta.moduleId;
						script.dataset.remoteModules = '';
						script.innerHTML = JSON.stringify(manifestJSON);
						document.head.appendChild(script);
					}),
					loader.fetch(loader.resolveURL(request, parent)).then(async res => {
						if (res.ok) {
							moduleId = res.headers['x-module-id'];
							pid = Number(res.headers['x-pointer-id']);
							type = res.headers['x-resource-type'];

							const element = document.createElement(type === 'css' ? 'style' : 'script');
							element.dataset.pid = pid;
							element.dataset.remoteModules = '';
							element.innerHTML = await res.text();
							document.head.appendChild(element);

							// JSDOM doesn't execute scripts synchronously
							if (
								type === 'js' &&
								process.env.NODE_ENV !== 'production' &&
								!loader.getFromContext(pid)
							) {
								await new Promise(resolve => {
									element.addEventListener('load', resolve);
								});
							}
						} else {
							const { message, ...other } = await res.json();
							const messageWithContext = parent ? `${message}${parent.trace()}` : message;
							throw Object.assign(new Error(messageWithContext), other);
						}
					})
				]);
			}
		}

		return { content: loader.context, moduleId, pid, type };
	}

	getModuleMeta(request, parent) {
		const pid = this.loader.resolvePid(request, parent);
		const moduleId = this.loader.resolve(request, parent);
		const type = (parent && parent.manifest.getType(pid)) || 'js';
		let meta;
		if (pid) {
			meta = { pid, moduleId, type };
		} else if (this.loader.getFromContext(calculatePID(moduleId))) {
			meta = { pid: calculatePID(moduleId), moduleId, type };
		} else {
			meta = {
				pid: getMainPid(moduleId),
				moduleId: getMainModuleId(moduleId),
				type: getMainType(moduleId)
			};
		}
		return meta;
	}

	getManifestJSON(id) {
		const manifestScript = document.querySelector(
			`script[type="application/json"][data-module-id="${id}"]:not([data-mark-sweep])`
		);
		const json = manifestScript && JSON.parse(manifestScript.innerText || manifestScript.innerHTML);
		return json ? Promise.resolve(json) : this.loader.fetchManifestJSON(id, { types: 'css,js' });
	}

	initialize(request, parent) {
		const { loader, pending } = this;
		if (!pending[request]) {
			pending[request] = new Promise(async (resolve, reject) => {
				try {
					const { content, moduleId, pid, type } = await this.loadResource(request, parent);
					if (type === 'js') {
						resolve(loader.register({ id: moduleId, pid, content, parent }));
					} else {
						const m = {
							id: moduleId,
							isMain: !parent,
							exports: {},
							loaded: false,
							manifest: null,
							exec: () => m.exports,
							load: async () => {
								if (m.isMain) {
									const json = await this.getManifestJSON(m.id);
									m.manifest = Manifest.load(json);
									await loader.ensure(m);
								}
								m.loaded = true;
								return m;
							}
						};
						resolve(m);
					}
				} catch (err) {
					reject(err);
				}
			});
			pending[request].catch(noop).then(() => {
				delete pending[request];
			});
		}
		return pending[request];
	}
}
