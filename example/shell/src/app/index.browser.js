/* eslint-env browser */

import React from 'react';
import ReactDOM from 'react-dom';
import createBrowserHistory from 'history/createBrowserHistory';

import createRouter from './router';
import Provider from './Provider';

const history = createBrowserHistory();

const router = createRouter({
	config: global.__CONFIG__,
	store: { ...global.__STORE__, history }
});

router.resolve(history.location).then(element => {
	const provider = ReactDOM.hydrate(
		<Provider>{element}</Provider>,
		document.querySelector('#root')
	);
	history.listen(async location => {
		const children = await router.resolve(location);
		provider.setState({ children });
	});
});
