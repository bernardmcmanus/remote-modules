import Path from 'path';

import Koa from 'koa';
import mount from 'koa-mount';
import serve from 'koa-static';

const { NODE_ENV } = process.env;

export default () => {
	const app = new Koa();

	app.use(serve(Path.resolve('dist/static')));

	if (NODE_ENV === 'development') {
		// Serve from source in development
		app.use(serve(Path.resolve('static')));
	} else {
		// Catch static 404s in production
		app.use(ctx => {
			ctx.status = 404;
		});
	}

	return mount('/static', app);
};
