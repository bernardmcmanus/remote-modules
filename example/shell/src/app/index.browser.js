/* eslint-env browser */

import ReactDOM from 'react-dom';
import createBrowserHistory from 'history/createBrowserHistory';

import createRouter from './router';

const history = createBrowserHistory();

const router = createRouter({
	config: global.__CONFIG__,
	store: { ...global.__STORE__, history }
});

const container = document.querySelector('#root');

history.listen(async location => {
	const element = await router.resolve(location);
	ReactDOM.render(element, container);
});

router.resolve(history.location).then(element => {
	ReactDOM.hydrate(element, container);
});
