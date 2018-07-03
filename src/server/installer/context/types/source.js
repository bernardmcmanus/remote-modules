import Path from 'path';
import { inspect } from 'util';

import defineProperties from '../../../../lib/helpers/defineProperties';
import { isAbsoluteURL } from '../../../../lib/helpers';
import { assembleResourceURL } from '../../../../lib/url-builder';
import { isCore } from '../../../../lib/resolver';

export default class SourceContext extends Map {
	constructor(requestObject, baseDir, factory, C) {
		const { value: originalRequest } = requestObject;

		super([
			['dirty', false],
			['error', undefined],
			['external', undefined],
			['force', undefined],
			['request', undefined],
			['resolved', undefined]
		]);

		defineProperties(this, { baseDir, C, factory, originalRequest });

		this.request = requestObject.value;
		this.requestObject = requestObject;
	}

	get async() {
		return Boolean(this.requestObject.async);
	}

	get dirty() {
		return this.get('dirty');
	}

	get error() {
		return this.get('error');
	}

	get extension() {
		return this.resolved && Path.extname(this.origin);
	}

	get force() {
		return this.get('force');
	}

	get moduleId() {
		if (this.force !== undefined) {
			return this.force;
		}
		const { factory, origin, resolved, slug } = this;
		return resolved ? factory.getModuleId(slug) : origin;
	}

	get origin() {
		return this.resolved || this.originalRequest;
	}

	get packageId() {
		const { factory, moduleId, resolved } = this;
		return resolved && factory.getPackageId(moduleId);
	}

	get pid() {
		return this.factory.getPid(this.moduleId);
	}

	get request() {
		return this.get('request');
	}

	get resolved() {
		return this.get('resolved') || null;
	}

	get slug() {
		const { factory, origin, resolved } = this;
		return resolved ? factory.getSlug(origin) : origin;
	}

	get url() {
		const { C, moduleId, requestObject } = this;
		switch (true) {
			case this.isExternal():
				return moduleId;
			case requestObject.static:
				return Path.join(C.getRoot().server.publicPath, '@static', moduleId);
			default:
				return assembleResourceURL(C.server.publicPath, moduleId);
		}
	}

	set external(value) {
		if (this.get('external') !== value) {
			this.set('external', value);
		}
	}

	set force(value) {
		if (this.get('force') !== value) {
			this.set('force', value);
		}
	}

	set request(value) {
		if (this.get('request') !== value) {
			this.set('request', value);
			this.resolved = value;
		}
	}

	set resolved(value) {
		if (this.get('force') === undefined && this.get('resolved') !== value) {
			try {
				this.set('resolved', this.factory.resolve(value, this.baseDir));
				this.set('error', null);
			} catch (err) {
				this.set('resolved', undefined);
				this.set('error', err);
			}
		}
	}

	digest() {
		const dirty = this.get('dirty');
		this.set('dirty', false);
		return dirty;
	}

	set(key, value) {
		super.set('dirty', true);
		super.set(key, value);
	}

	isExternal() {
		return this.get('external') !== undefined
			? this.get('external')
			: isCore(this.resolved) || isAbsoluteURL(this.resolved);
	}

	isNull() {
		return this.resolved === null;
	}

	isNormal() {
		return !this.isExternal() && !this.isNull();
	}

	inspect() {
		const descriptors = {
			...Object.getOwnPropertyDescriptors(SourceContext.prototype),
			...Object.getOwnPropertyDescriptors(this)
		};
		const result = {};
		for (const [key, { value }] of Object.entries(descriptors)) {
			switch (true) {
				case key === 'C':
					// noop
					break;
				case key === 'error':
					result.error = this.error && this.error.message;
					break;
				case typeof value !== 'function':
					try {
						result[key] = this[key];
					} catch (err) {
						result[key] = err;
					}
					break;
				default:
					// noop
					break;
			}
		}
		return inspect(result, { colors: true });
	}
}
