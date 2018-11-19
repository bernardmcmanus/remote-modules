import Resolver from './Resolver';
import Request from './Request';
import Resource from './Resource';

export interface RequestContextOptions {
	resolver: Resolver;
	request: Request;
}

export default class RequestContext {
	resolver: Resolver;
	request: Request;
	resource?: Resource;
	_resolved?: string;

	constructor({ resolver, request }: RequestContextOptions) {
		this.resolver = resolver;
		this.request = request;
	}

	get resolved() {
		return this._resolved;
	}

	set resolved(value) {
		this._resolved = value;
	}

	resolveSync() {
		const { resolver, request } = this;
		this.resolved = resolver.sync(request.pathname, request.base);
		return this.resolved;
	}

	async resolveAsync() {
		const { resolver, request } = this;
		this.resolved = await resolver.async(request.pathname, request.base);
		return this.resolved;
	}
}
