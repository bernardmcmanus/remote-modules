import Path from 'path';
import Url from 'url';
import { inspect } from 'util';

import { isCore, resolveSync } from '../../../lib/resolver';
import { isAbsolutePath, isAbsoluteURL, matches } from '../../../lib/helpers';
import defineProperties from '../../../lib/helpers/defineProperties';
import escapeRegExp from '../../../lib/helpers/escapeRegExp';
import last from '../../../lib/helpers/last';
import memoize from '../../../lib/helpers/memoize';
import ConfigStore from '../../../lib/config-store';
import calculatePID from '../../../lib/helpers/pid';
import SourceContext from './types/source';

export function isInstalledPackage(slug, moduleDirs) {
	return moduleDirs.some(dir => slug.includes(`${dir}/`));
}

export function getSlug(origin, relativeTo) {
	return origin && isAbsolutePath(origin) ? Path.relative(relativeTo, origin) : origin;
}

export function getModuleId(slug, moduleDirs) {
	const isRelative = !isCore(slug) && !moduleDirs.some(dir => slug.includes(`${dir}/`));
	const normalized = Path.relative('/', Path.normalize(`/${slug}`));
	const moduleDirsRegExp = new RegExp(`^(${moduleDirs.map(escapeRegExp).join('|')})/`);
	return `${isRelative ? './' : ''}${normalized.replace(moduleDirsRegExp, '')}`;
}

export function getPackageId(moduleId, moduleDirs) {
	if (isAbsoluteURL(moduleId)) {
		return null;
	}
	const packageSegment = moduleDirs.reduce(
		(result, dir) => last(result.split(`${dir}/`)),
		moduleId
	);
	return packageSegment.match(/^(\.|(?:@[^/]+\/)?[^/]+)(?:\/|$)/)[1];
}

export function getPid(moduleId) {
	return calculatePID(moduleId);
}

export function getManifestPath(resolved) {
	return `${resolved}.manifest.js`;
}

export function slugToAbsolutePath(baseDir, slug) {
	return Path.join(baseDir, Path.normalize(`/${slug}`));
}

export default function ContextFactory(options) {
	const C = ConfigStore.from(options);
	const cacheKeyResolver = (request, baseDir) =>
		`${(request && request.value) || request}:${baseDir}`;

	const contextualResolve = memoize((request, baseDir) => {
		let resolved;
		if (typeof request === 'string' && !isAbsolutePath(request) && !isAbsoluteURL(request)) {
			resolved = resolveSync(Url.parse(request).pathname, {
				...C.pick(['core', 'extensions', 'mainFields', 'moduleDirs', 'rootDir']),
				baseDir: typeof baseDir === 'string' ? baseDir : C.rootDir
			});
		} else {
			resolved = request;
		}
		return resolved;
	}, cacheKeyResolver);

	const createContext = memoize((request, baseDir) => {
		// eslint-disable-next-line no-use-before-define
		const ctx = new SourceContext(request, baseDir, factory, options);

		let iterations = 0;
		while (ctx.digest()) {
			C.runMiddleware('context', [ctx]);
			if (iterations > 1000) {
				throw new Error(`Exceeded max middleware iterations for '${ctx.moduleId}'`);
			}
			iterations += 1;
		}

		if (C.strict && ctx.error) {
			throw ctx.error;
		}

		return ctx;
	}, cacheKeyResolver);

	function factory(request, resolverPaths = [undefined]) {
		if (typeof request !== 'string' && !request.value) {
			throw new Error(`Expected String or Object({ value: String }) but got '${inspect(request)}'`);
		}
		if (!Array.isArray(resolverPaths)) {
			throw new Error(`Expected an array but got '${inspect(resolverPaths)}'`);
		}
		let ctx;
		for (const baseDir of resolverPaths) {
			ctx = createContext(request, baseDir);
			if (ctx.resolved) {
				break;
			}
		}
		if (ctx.error) {
			// Don't cache unresolvable requests
			factory.uncache({ pid: ctx.pid });
		}
		return ctx;
	}

	return defineProperties(factory, {
		name: 'ContextFactory',
		resolve: contextualResolve,
		safeResolve(...args) {
			try {
				return contextualResolve(...args);
			} catch (_err) {
				return null;
			}
		},
		getPid,
		getSlug(origin) {
			return getSlug(origin, C.rootDir);
		},
		getModuleId(slug, moduleDirs = C.moduleDirs) {
			return getModuleId(slug, moduleDirs);
		},
		getPackageId(moduleId, moduleDirs = C.moduleDirs) {
			return getPackageId(moduleId, moduleDirs);
		},
		isInstalledPackage(slug, moduleDirs = C.moduleDirs) {
			return isInstalledPackage(slug, moduleDirs);
		},
		uncache(query) {
			if (query) {
				for (const [key, ctx] of createContext.cache) {
					if (matches(ctx, query)) {
						contextualResolve.cache.delete(key);
						createContext.cache.delete(key);
					}
				}
			} else {
				contextualResolve.cache.clear();
				createContext.cache.clear();
			}
		}
	});
}
