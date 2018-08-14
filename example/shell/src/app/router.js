import React from 'react';
import Router from 'universal-router';
import ImportClient from 'remote-modules';

import Main from './Main';

const client = new ImportClient({
	uri: `${process.browser ? '' : 'http://nginx'}/fragments`,
	externalRequire: process.browser ? global.require : undefined
});

const scope = process.browser ? 'browser' : 'node';

const routes = {
	children: [
		{
			action: async ({ next }) => client.reset(next)
		},
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

export default initialContext => {
	const router = new Router(routes, {
		context: initialContext,
		errorHandler: err => {
			console.error(err.stack);
			router.context.status = err.code || 500;
			return err.code === 404 ? <h1>Not Found</h1> : <h1>Internal Server Error</h1>;
		}
	});
	return router;
};
