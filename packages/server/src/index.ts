import http from 'http';
import { AddressInfo } from 'net';

import Koa from 'koa';
import Router from 'koa-router';
import etag from 'koa-etag';
import conditional from 'koa-conditional-get';
import logger from '@remote-modules/logger';
import { promisify } from '@remote-modules/helpers';

import timingMiddleware from './middleware/timing';

export default function Server() {
	const app = new Koa();
	const router = new Router();

	router.get('/up/', ctx => {
		ctx.state.noLog = true;
		ctx.status = 204;
	});

	app
		.use(timingMiddleware())
		.use(conditional())
		.use(etag())
		.use(router.routes())
		.use(router.allowedMethods())
		.use(ctx => {
			ctx.status = 404;
			ctx.body = { message: 'Not Found' };
		});

	app.on('error', err => {
		logger.error(err);
	});

	const server = http.createServer(app.callback());

	async function listen(port: number) {
		await promisify(server.listen, server)(port);
		const address = server.address() as AddressInfo;
		logger.info(`Listening on ${address.port}`);
	}

	async function close() {
		await promisify(server.close, server)();
	}

	return Object.freeze(
		Object.assign(Object.create(server), {
			app,
			listen,
			close
		})
	);
}
