import Path from 'path';

import { get, escapeRegExp, defineProperties, last } from '@remote-modules/helpers';

import Resolver from './Resolver';
import Request from './Request';
import Resource from './Resource';

export interface RequestContextOptions {
	resolver: Resolver;
	request: Request;
}

export default class RequestContext {
	static getSlug(resolved: string, resolver: Resolver) {
		return resolved && Path.isAbsolute(resolved)
			? Path.relative(resolver.rootDir, resolved)
			: resolved;
	}

	static getModuleId(slug: string, resolver: Resolver) {
		const isRelative =
			!resolver.isCore(slug) && !resolver.moduleDirs.some(dir => slug.includes(`${dir}/`));
		const normalized = Path.relative('/', Path.normalize(`/${slug}`));
		const moduleDirsRegExp = new RegExp(`^(${resolver.moduleDirs.map(escapeRegExp).join('|')})/`);
		return `${isRelative ? './' : ''}${normalized.replace(moduleDirsRegExp, '')}`;
	}

	static getPackageId(moduleId: string, resolver: Resolver) {
		if (!moduleId || Path.isAbsolute(moduleId)) {
			return null;
		}
		const packageSegment = resolver.moduleDirs.reduce(
			(result, dir) => last(result.split(`${dir}/`)),
			moduleId
		);
		return get(packageSegment.match(/^(\.|(?:@[^/]+\/)?[^/]+)(?:\/|$)/), [1]);
	}

	resolver: Resolver;
	request: Request;
	resource?: Resource;
	_slug?: string;
	_moduleId?: string;
	_packageId?: string | null = null;
	_resolved?: string | null = null;

	constructor(opts: RequestContextOptions) {
		this.resolver = opts.resolver;
		this.request = opts.request;
		defineProperties(this, opts);
	}

	get resolved() {
		return this._resolved;
	}

	set resolved(value) {
		this._resolved = value;
		if (typeof value === 'string') {
			this._slug = RequestContext.getSlug(value, this.resolver);
			this._moduleId = RequestContext.getModuleId(this.slug, this.resolver);
			this._packageId = RequestContext.getPackageId(this.moduleId, this.resolver);
		}
	}

	get slug(): string {
		return <any>this._slug;
	}

	get moduleId(): string {
		return <any>this._moduleId;
	}

	get packageId(): string | null {
		return <any>this._packageId;
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
