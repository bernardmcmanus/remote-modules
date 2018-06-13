/* eslint-env browser */

import calculatePID from '../../lib/helpers/pid';
import defineProperties from '../../lib/helpers/defineProperties';
import noop from '../../lib/helpers/noop';

function getMainScript(request) {
	const mainScript = document.querySelector('script[data-main][data-module-id][data-pid]');
	return mainScript && (mainScript.getAttribute('data-module-id') || '').includes(request)
		? mainScript
		: null;
}

function getMainModuleId(request) {
	const mainScript = getMainScript(request);
	return (mainScript && mainScript.getAttribute('data-module-id')) || undefined;
}

function getMainPid(request) {
	const mainScript = getMainScript(request);
	return (mainScript && Number(mainScript.getAttribute('data-pid'))) || undefined;
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

	async loadScript(request, parent) {
		const { loader } = this;
		let { moduleId, pid } = this.getModuleMeta(request, parent);

		if (!loader.getFromContext(pid)) {
			if (pid) {
				const script = document.createElement('script');
				const url = loader.getResourceURL(request, parent);
				await new Promise((resolve, reject) => {
					script.onload = () => resolve();
					script.onerror = () => reject(new Error(`Failed to load '${url}'`));
					script.src = url;
					document.head.appendChild(script);
				});
			} else {
				await Promise.all([
					loader.fetchManifestJSON(request).then(manifestJSON => {
						const script = document.createElement('script');
						script.setAttribute('type', 'application/json');
						script.setAttribute('data-module-id', manifestJSON.meta.moduleId);
						script.innerHTML = JSON.stringify(manifestJSON);
						document.head.appendChild(script);
					}),
					loader.fetch(loader.getResourceURL(request, parent)).then(async res => {
						if (res.ok) {
							const script = document.createElement('script');
							moduleId = res.headers['x-module-id'];
							pid = Number(res.headers['x-pointer-id']);
							script.setAttribute('data-pid', pid);
							script.innerHTML = await res.text();
							document.head.appendChild(script);
						} else {
							const { message, ...other } = await res.json();
							const messageWithContext = parent ? `${message}${parent.trace()}` : message;
							throw Object.assign(new Error(messageWithContext), other);
						}
					})
				]);
			}
		}

		return { content: loader.context, moduleId, pid };
	}

	getModuleMeta(request, parent) {
		const pid = this.loader.resolvePid(request, parent);
		const moduleId = this.loader.resolve(request, parent);
		let meta;
		if (pid) {
			meta = { pid, moduleId };
		} else if (this.loader.getFromContext(calculatePID(moduleId))) {
			meta = { pid: calculatePID(moduleId), moduleId };
		} else {
			meta = {
				pid: getMainPid(moduleId),
				moduleId: getMainModuleId(moduleId)
			};
		}
		return meta;
	}

	// eslint-disable-next-line class-methods-use-this
	getManifestJSON(id) {
		const manifestScript = document.querySelector(
			`script[type="application/json"][data-module-id="${id}"]`
		);
		return manifestScript && JSON.parse(manifestScript.innerText || manifestScript.innerHTML);
	}

	initialize(request, parent) {
		const { loader, pending } = this;
		if (!pending[request]) {
			pending[request] = new Promise(async (resolve, reject) => {
				try {
					const { content, moduleId, pid } = await this.loadScript(request, parent);
					resolve(loader.register({ id: moduleId, pid, content, parent }));
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
