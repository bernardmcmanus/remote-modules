import React from 'react';
import Router from 'universal-router';
import ImportClient from 'remote-module';

import Main from './Main';

const client = new ImportClient({
	uri: `${process.browser ? '' : 'http://nginx'}/fragments`,
	externalRequire: process.browser ? global.require : undefined
});

const scope = process.browser ? 'browser' : 'node';

const routes = {
	children: [
		{
			path: '/:fragment',
			action: async (ctx, { fragment }) => {
				const createElement = await client.import(`<${fragment}/@${scope}>`);
				if (!process.browser) {
					const [css, js] = await Promise.all([
						client.renderStatic(`<${fragment}/@browser>`, 'css'),
						client.renderStatic(`<${fragment}/@browser>`, 'js')
					]);
					ctx.stylesheets.push(css);
					ctx.scripts.push(js);
				}
				return createElement(ctx);
			}
		},
		{
			path: '/',
			action: () => <h1>Home</h1>
		}
	],
	action: async ctx => <Main {...ctx.store}>{await ctx.next()}</Main>
};

export default context =>
	new Router(routes, {
		context,
		errorHandler: err => {
			console.error(err.stack);
			return err.code === 404 ? <h1>Not Found</h1> : <h1>Internal Server Error</h1>;
		}
	});
