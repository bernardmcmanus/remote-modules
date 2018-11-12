import http from 'http';
import { AddressInfo } from 'net';

import Koa from 'koa';
import Router from 'koa-router';
import etag from 'koa-etag';
import conditional from 'koa-conditional-get';
import logger from '@remote-modules/logger';

import timingMiddleware from './middleware/timing';

export default class Server extends http.Server {
	readonly app = new Koa();
	readonly router = new Router();
	private requestListener: (req: http.IncomingMessage, res: http.ServerResponse) => void;

	constructor() {
		super((...args) => {
			this.requestListener(...args);
		});

		const { app, router } = this;

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

		this.requestListener = app.callback();
	}

	address(): AddressInfo {
		return super.address() as AddressInfo;
	}

	// @ts-ignore
	listen(port: number): Promise<void> {
		return new Promise(resolve => {
			super.listen(port, resolve);
		}).then(() => {
			logger.info(`Listening on ${this.address().port}`);
		});
	}

	// @ts-ignore
	close(): Promise<void> {
		return new Promise(resolve => {
			super.close(resolve);
		});
	}
}
