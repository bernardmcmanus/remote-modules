import http from 'http';

import Koa from 'koa';
import Router from 'koa-router';
import conditional from 'koa-conditional-get';
import etag from 'koa-etag';

import timingMiddleware from './middleware/timing';
import shellMiddleware from './middleware/shell';
import staticMiddleware from './middleware/static';

const app = new Koa();
const router = new Router();

app.on('error', err => {
	console.error(err.stack);
});

router.get('/up', ctx => {
	ctx.state.noLog = true;
	ctx.status = 200;
});

const server = http.createServer(app.callback());

app
	.use(timingMiddleware())
	.use(conditional())
	.use(etag())
	.use(staticMiddleware())
	.use(router.routes())
	.use(shellMiddleware(server));

server.listen(3000, () => {
	console.info(`Listening on ${server.address().port}`);
});
