import Koa from 'koa';
import mount from 'koa-mount';
import serialize from 'serialize-javascript';

import render from '../../app/index.node';

const { NODE_ENV } = process.env;

export default server => {
	const app = new Koa();

	// webpack development hooks
	if (NODE_ENV === 'development') {
		const koawp = require('koa-webpack');
		app.use(
			koawp({
				config: require('../../../webpack/config.shell').default,
				dev: {
					serverSideRender: true,
					stats: {
						colors: true,
						modules: false
					}
				},
				hot: false
			})
		);
	}

	app.use(async ctx => {
		const data = await render(ctx);
		ctx.body = `
			<html>
				<head>
					<meta name="viewport" content="width=device-width, minimum-scale=1, initial-scale=1">
					<link rel="icon" type="image/x-icon" href="/static/favicon.ico">
					<link rel="stylesheet" href="/static/layout.css" />
					${data.head}
					${data.stylesheets}
				</head>
				<body>
					<div id="root">${data.main}</div>
					<script>
						window.__CONFIG__ = ${serialize(data.config, { isJSON: true })};
						window.__STORE__ = ${serialize(data.store, { isJSON: true })};
					</script>
					${data.scripts}
					<script src="/static/remote-modules/client.browser.js"></script>
					<script src="/static/dll.js"></script>
					<script src="/static/shell.js"></script>
				</body>
			</html>
		`;
	});

	return mount('/', app);
};
