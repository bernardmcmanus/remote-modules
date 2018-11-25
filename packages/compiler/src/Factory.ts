import Path from 'path';

import { defineProperties, memoize, pickBy } from '@remote-modules/helpers';

import CacheFile from './CacheFile';
import Resolver, { ResolverOptions } from './Resolver';
import Request from './Request';
import RequestContext from './RequestContext';
import Resource from './Resource';

export type FactoryHooks = {
	request?: (request: Request) => Promise<void>;
	context?: (ctx: RequestContext) => Promise<void>;
	resource?: (resource: Resource) => Promise<void>;
};

export type FactoryOptions = {
	scope: string;
} & ResolverOptions;

export type FactoryProps = {
	clear: () => void;
	load: () => void;
	commit: () => void;
	cache: CacheFile;
};

export type Factory = ((
	input?: string,
	base?: string,
	hooks?: FactoryHooks
) => Promise<RequestContext>) &
	FactoryProps;

export default function createFactory({
	scope,
	rootDir,
	extensions,
	mainFields,
	moduleDirs
}: FactoryOptions): Factory {
	const cache = new CacheFile(scope);

	const resolver = new Resolver({
		rootDir,
		extensions,
		mainFields,
		moduleDirs
	});

	const createRequest = memoize(
		(input?: string, base?: string) =>
			new Request(input || '.', Path.resolve(rootDir, base || '.')),
		(input?: string, base?: string) => [input, base].join(':')
	);

	const createContext = memoize(
		(request: Request) => new RequestContext({ resolver, request }),
		(request: Request) => [request.input, request.base].join(':')
	);

	const createResource = memoize(
		(ctx: RequestContext) =>
			new Resource({
				id: ctx.slug,
				options: { rootDir },
				...pickBy(cache.resources[ctx.slug], value => value !== undefined)
			}),
		(ctx: RequestContext) => ctx.resolved
	);

	return <any>defineProperties(
		async (input?: string, base?: string, hooks: FactoryHooks = {}) => {
			const request = createRequest(input, base);

			if (hooks.request) {
				await hooks.request(request);
			}

			const ctx = createContext(request);

			if (hooks.context) {
				await hooks.context(ctx);
			}

			await ctx.resolveAsync();

			const resource = createResource(ctx);

			await resource.load();

			cache.resources[ctx.slug as string] = resource;

			if (hooks.resource) {
				await hooks.resource(resource);
			}

			return defineProperties(ctx, { resource });
		},
		{
			cache,
			createRequest,
			createContext,
			createResource,
			clear: () => {
				createRequest.cache.clear();
				createContext.cache.clear();
				createResource.cache.clear();
			},
			load: async () => {
				await cache.load();
			},
			commit: async () => {
				await cache.commit();
			}
		}
	);
}
