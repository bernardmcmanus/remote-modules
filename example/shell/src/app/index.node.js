import ReactDOMServer from 'react-dom/server';
import Helmet from 'react-helmet';
import createMemoryHistory from 'history/createMemoryHistory';

import createRouter from './router';

const { NODE_ENV } = process.env;

export default async ctx => {
	const history = createMemoryHistory({ initialEntries: [ctx.url] });
	const router = createRouter({
		config: { NODE_ENV },
		store: { history },
		stylesheets: [],
		scripts: []
	});
	const element = await router.resolve(history.location);
	const main = ReactDOMServer.renderToString(element);
	const head = Object.values(Helmet.renderStatic())
		.map(value => value.toString())
		.join('');
	return { ...router.context, head, main };
};
