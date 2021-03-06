import http from 'http';
import Url from 'url';
import Path from 'path';

import Koa from 'koa';
import Router from 'koa-router';
import etag from 'koa-etag';
import conditional from 'koa-conditional-get';

import logger from '../lib/logger';
import escapeRegExp from '../lib/helpers/escapeRegExp';
import once from '../lib/helpers/once';
import pick from '../lib/helpers/pick';
import { readFileAsync } from '../lib/helpers/fs';
import Manifest from '../lib/manifest';
import ConfigStore from '../lib/config-store';
import { assembleResourceURL, getResourcePathFromID } from '../lib/url-builder';
import { getManifestPath, slugToAbsolutePath } from './installer/context';
import ResourceFactory from './installer/resource';
import Installer from './installer';
import Watcher from './installer/watcher';

import timingMiddleware from './middleware/timing';

// eslint-disable-next-line no-process-env
const ENV = process.env.BUILD_ENV || process.env.NODE_ENV || process.env.BABEL_ENV;

function getResponseBody(path) {
	return readFileAsync(path, null);
}

function generateTag({ type, target, ...other }) {
	const attributes = Object.entries(other)
		.map(([key, value]) => (value === true ? key : `${key}="${value}"`))
		.join(' ');
	switch (type) {
		case 'css':
			return `<link href="${target}" rel="stylesheet" ${attributes} />`;
		case 'js':
			return `<script src="${target}" ${attributes}></script>`;
		case 'json':
			return `<script type="application/json" ${attributes}>${target}</script>`;
		default:
			return '';
	}
}

function createScopeRouter(C, watcher) {
	const router = new Router();
	const { contextFactory, outputPath } = new ResourceFactory(C);

	const getModuleMap = once(() => {
		// eslint-disable-next-line global-require, import/no-dynamic-require
		const { modules } = require(outputPath);
		if (ENV === 'test') {
			setImmediate(() => {
				delete require.cache[outputPath];
				getModuleMap.clear();
			});
		} else if (C.watch) {
			watcher.once('beforeupdate', () => {
				delete require.cache[outputPath];
				getModuleMap.clear();
			});
		}
		return modules;
	});

	const getAssetMap = once(() => {
		// eslint-disable-next-line global-require, import/no-dynamic-require
		const { assets } = require(outputPath);
		if (ENV === 'test') {
			setImmediate(() => {
				delete require.cache[outputPath];
				getAssetMap.clear();
			});
		} else if (C.watch) {
			watcher.once('beforeupdate', () => {
				delete require.cache[outputPath];
				getAssetMap.clear();
			});
		}
		return assets;
	});

	const basePathname = Url.parse(C.server.uri).pathname;
	const staticFiles = C.server.static;

	function getManifestJSON(path, opts) {
		// eslint-disable-next-line global-require, import/no-dynamic-require
		const json = require(path)({ assetMap: getAssetMap(), ...opts });
		if (ENV === 'test') {
			delete require.cache[path];
		} else if (C.watch) {
			watcher.once('beforeupdate', () => {
				delete require.cache[path];
			});
		}
		return json;
	}

	function scopeResolver(request, safe) {
		const ctx = contextFactory((request || C.entry).replace(/^:|(:\d+){1,2}$/g, ''));
		if (ctx.error && !safe) {
			throw ctx.error;
		}
		const mappedSlug = getModuleMap()[ctx.slug] || ctx.slug;
		const manifestPath = getManifestPath(slugToAbsolutePath(C.outputDir, mappedSlug));
		const resolved = slugToAbsolutePath(C.outputDir, getAssetMap()[mappedSlug] || mappedSlug);
		const sourceMap = slugToAbsolutePath(C.outputDir, `${ctx.slug}.map`);
		return {
			...pick(ctx, ['error', 'moduleId', 'origin', 'pid']),
			manifestPath,
			resolved,
			sourceMap
		};
	}

	function getResourceType(resolved) {
		const type = Path.extname(resolved).replace(/^\./, '');
		return type === 'css' || type === 'js' ? type : 'raw';
	}

	function getResourcePath(moduleId, query) {
		return assembleResourceURL({ pathname: basePathname }, moduleId, query);
	}

	function renderStaticTags(request, type) {
		const ctx = scopeResolver(request);
		const manifest = Manifest.load(
			getManifestJSON(ctx.manifestPath, {
				dependencyFilter: meta => !type || type === meta.type
			})
		);

		const tags = manifest.list().reduce((acc, moduleId) => {
			const assetId = manifest.getAssetId(moduleId);
			if (!acc.has(assetId) && assetId !== manifest.meta('assetId')) {
				acc.set(
					assetId,
					generateTag({
						target: getResourcePath(assetId),
						type: manifest.getType(moduleId),
						'data-pid': manifest.getPid(moduleId),
						'data-remote-modules': true
					})
				);
			}
			return acc;
		}, new Map());

		if (!type || type === manifest.meta('type')) {
			tags.set(
				manifest.meta('assetId'),
				generateTag({
					type: manifest.meta('type'),
					target: getResourcePath(manifest.meta('assetId')),
					'data-module-id': manifest.meta('moduleId'),
					'data-pid': manifest.meta('pid'),
					'data-main': true,
					'data-remote-modules': true
				})
			);
		}

		if (!type || type === 'js') {
			tags.set(
				ctx.manifestPath,
				generateTag({
					type: 'json',
					target: JSON.stringify(
						getManifestJSON(ctx.manifestPath, {
							dependencyFilter: meta => meta.type !== 'raw'
						})
					),
					'data-module-id': manifest.meta('moduleId'),
					'data-pid': manifest.meta('pid'),
					'data-remote-modules': true
				})
			);
		}

		return [...tags.values()].join('\n');
	}

	// FOR DEVELOPMENT ONLY!!! REMOVE!!!
	if (ENV !== 'production') {
		router.get('/browser(/)?:request(.*)', async ctx => /* istanbul ignore next */ {
			const { request } = ctx.params;
			const { moduleId } = scopeResolver(request);
			const auto = ctx.query.auto !== 'false';
			const dynamic = Boolean(ctx.query.dynamic);
			ctx.body = `
				<html>
					<head>
						${dynamic ? '' : renderStaticTags(request, 'css')}
					</head>
					<body>
						<script>
							window.IMPORT_SCOPE = '${C.scopeKey}';
							window.IMPORT_REQUEST = '${ctx.query.import ||
								`<${C.scopeKey}>/${getResourcePathFromID(moduleId)}`}';
							console.time('client:import');
						</script>
						${dynamic ? '' : renderStaticTags(request, 'js')}
						<script src="${basePathname}/static/dist/client.browser.js"></script>
						<script>
							window.client = new ImportClient({
								uri: '${C.getRoot().server.uri}'
							});
							if (${auto}) {
								client
									.import(window.IMPORT_REQUEST)
									.then(result => console.log(result))
									.catch(err => console.error(err.stack))
									.then(() => console.timeEnd('client:import'));
							}
						</script>
					</body>
				</html>
			`;
		});
	}

	/**
	 * FIXME: This is weird, but it's presumably common for
	 * static assets to live in '<root>/static', which means
	 * their paths would be of the form '/static/static/<asset>'.
	 */
	router.get('/static(/static)?/:path(.*)', async ctx => {
		const { path } = ctx.params;
		if (staticFiles.has(path)) {
			ctx.body = await getResponseBody(path);
			ctx.type = Path.extname(path);
		}
	});

	router.get('/manifest(/)?:request(.*)', async (ctx, next) => {
		try {
			const types = new Set((ctx.query.types || 'js').split(','));
			const { manifestPath, moduleId, pid, resolved } = scopeResolver(ctx.params.request);
			ctx.set('x-module-id', moduleId);
			ctx.set('x-pointer-id', pid);
			ctx.set('x-resource-type', getResourceType(resolved));
			ctx.body = getManifestJSON(manifestPath, {
				dependencyFilter: meta => types.has(meta.type)
			});
			ctx.type = '.json';
		} catch (err) {
			if (err.code !== 'ENOENT' && err.code !== 'MODULE_NOT_FOUND') {
				throw err;
			}
			await next();
		}
	});

	router.get('/render(/)?:request(.*)', ctx => {
		ctx.body = renderStaticTags(ctx.params.request, ctx.query.type);
	});

	router.get('/_/~/:request(.*)', async (ctx, next) => {
		try {
			const resolved = Path.join(C.outputDir, ctx.params.request);
			ctx.set('x-resource-type', getResourceType(resolved));
			ctx.body = await getResponseBody(resolved);
			ctx.type = Path.extname(resolved);
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
			await next();
		}
	});

	router.get('/_(/)?:request(.*)', async (ctx, next) => {
		try {
			const { resolved, moduleId, pid } = scopeResolver(ctx.params.request);
			ctx.set('x-module-id', moduleId);
			ctx.set('x-pointer-id', pid);
			ctx.set('x-resource-type', getResourceType(resolved));
			if (ctx.method === 'HEAD') {
				// fast return for resolve calls
				ctx.status = 204;
			} else {
				ctx.body = await getResponseBody(resolved);
				ctx.type = Path.extname(resolved);
			}

			// FOR DEVELOPMENT ONLY!!! REMOVE!!!
			/* istanbul ignore next */
			if (ENV !== 'production' && ctx.query.eval) {
				// eslint-disable-next-line global-require
				const { default: Client } = require('../client');
				const client = new Client({ uri: C.server.uri });
				const profileEnd = logger.profile();
				client
					.import(moduleId)
					.then(result => {
						logger.info(result);
						profileEnd(`import ${moduleId}`);
					})
					.catch(err => logger.error(err));
			}
		} catch (err) {
			if (err.code !== 'ENOENT' && err.code !== 'MODULE_NOT_FOUND') {
				throw err;
			}
			await next();
		}
	});

	router.get('/_(/)?:request(.*).map', async (ctx, next) => {
		try {
			const { sourceMap } = scopeResolver(ctx.params.request);
			ctx.body = await getResponseBody(sourceMap);
			ctx.type = Path.extname(sourceMap);
		} catch (err) {
			if (err.code !== 'ENOENT' && err.code !== 'MODULE_NOT_FOUND') {
				throw err;
			}
			await next();
		}
	});

	if (C.server.redirects) {
		router.get('(.*)', ctx => {
			const regexp = new RegExp(`${escapeRegExp(basePathname)}/?`);
			const request = ctx.path.replace(regexp, '');
			let location;
			try {
				const { moduleId } = scopeResolver(request);
				location = getResourcePath(moduleId, ctx.query);
			} catch (err) {
				if (err.code !== 'MODULE_NOT_FOUND') {
					throw err;
				}
				location = Path.join(basePathname, '/_', request);
			}
			ctx.redirect(location);
		});
	}

	router.use(ctx => {
		ctx.status = 404;
		ctx.body = {
			message: `Cannot find module '${ctx.path}'`,
			status: 404,
			code: 'MODULE_NOT_FOUND',
			path: ctx.path
		};
	});

	return new Router().use(`/${C.scopeKey}`, router.routes(), router.allowedMethods());
}

function createServer(C, watcher) {
	const app = new Koa();
	const appRouter = new Router();
	const basePublicPath = C.getRoot().get(['server', 'publicPath']);
	let statusCounts;

	if (ENV === 'test') {
		statusCounts = new Map();
		appRouter.use(async (ctx, next) => {
			await next();
			if (!statusCounts.get(ctx.status)) {
				statusCounts.set(ctx.status, 0);
			}
			statusCounts.set(ctx.status, statusCounts.get(ctx.status) + 1);
		});
	}

	appRouter.get('/up/', ctx => {
		ctx.state.noLog = true;
		ctx.body = 'OK';
	});

	C.scopes().forEach(scope => {
		const c = C.use(scope);
		const publicPath = c.get(['server', 'publicPath']);
		const scopeRouter = createScopeRouter(c, watcher);

		appRouter.get(Path.join(basePublicPath, '/@static/:request(.*)'), async (ctx, next) => {
			ctx.path = assembleResourceURL({ pathname: publicPath }, ctx.params.request);
			await scopeRouter.routes()(ctx, next);
			if (ctx.status === 404) {
				ctx.url = ctx.originalUrl;
				await next();
			}
		});

		appRouter.use('(.*)', scopeRouter.routes(), scopeRouter.allowedMethods());
	});

	app
		.use(timingMiddleware())
		.use(conditional())
		.use(etag())
		.use(appRouter.routes())
		.use(appRouter.allowedMethods())
		.use(ctx => {
			ctx.status = 404;
			ctx.body = { message: 'Not Found' };
		});

	app.on('error', err => {
		logger.error(err);
	});

	const server = http.createServer(app.callback());

	return { app, server, statusCounts };
}

export default function Server(options) {
	const C = ConfigStore.from(options);
	const watcher = new Watcher();
	const installers = C.scopes().map(scope => {
		const c = C.use(scope);
		const scopeLogger = logger.child({ name: c.scopeKey });
		const install = new Installer(c);
		return async (force, ...other) => {
			const { resourceFactory } = await install(force, ...other);
			if (c.watch) {
				watcher.subscribe(resourceFactory, async events => {
					events.forEach(([, resource]) => resource.markDirty());
					await install(false, ...other);
				});
				watcher.on('error', err => {
					scopeLogger.error(err.frame || err);
				});
				watcher.once('ready', () => {
					scopeLogger.info(
						`Watching '${Path.relative(process.cwd(), c.entryDir) || '.'}' for changes`
					);
				});
			}
			return resourceFactory();
		};
	});

	let app;
	let server;
	let statusCounts;

	function listen(port = C.server.port) {
		if (!server) {
			({ app, server, statusCounts } = createServer(C, watcher));
		}
		return new Promise(resolve => {
			server.listen(port, resolve);
		}).then(() => {
			logger.info(`Listening on ${server.address().port}`);
		});
	}

	async function close() {
		watcher.close();
		if (server) {
			await server.close();
		}
	}

	return Object.freeze({
		install: async (...args) => {
			watcher.reset();
			const result = await Promise.all(installers.map(install => install(...args)));
			await watcher.start();
			return result;
		},
		watcher,
		listen,
		close,
		get app() {
			return app;
		},
		get server() {
			return server;
		},
		get statusCounts() {
			return statusCounts;
		}
	});
}
