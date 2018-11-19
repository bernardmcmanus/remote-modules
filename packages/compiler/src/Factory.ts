import Path from 'path';

import { defineProperties, memoize } from '@remote-modules/helpers';

import Resolver, { ResolverOptions } from './Resolver';
import Request from './Request';
import RequestContext from './RequestContext';
import Resource from './Resource';

export type FactoryHooks = {
	request?: (request: Request) => Promise<void>;
	context?: (ctx: RequestContext) => Promise<void>;
	resource?: (resource: Resource) => Promise<void>;
};

export interface FactoryOptions extends ResolverOptions {}

export interface Factory {
	(input?: string, base?: string, hooks?: FactoryHooks): Promise<RequestContext>;
	clear: () => void;
}

export default function createFactory({
	rootDir,
	extensions,
	mainFields,
	moduleDirs
}: FactoryOptions): Factory {
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

	const createResource = memoize((resolved: string) => new Resource(resolved, {}));

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

			const resolved = await ctx.resolveAsync();
			const resource = createResource(resolved);

			if (hooks.resource) {
				await hooks.resource(resource);
			}

			return Object.assign(ctx, { resource });
		},
		{
			createRequest,
			createContext,
			createResource,
			clear: () => {
				createRequest.cache.clear();
				createContext.cache.clear();
				createResource.cache.clear();
			}
		}
	);
}
