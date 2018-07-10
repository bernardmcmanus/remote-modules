import 'raf/polyfill';

import React, { Fragment } from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactDOMServerBrowser from 'react-dom/server.browser';

import './styles.css';
import './styles.less';
import './styles.scss';

function RequestAttributes() {
	return (
		<Fragment>
			<div className="no-attributes" />
			<div className="href" />
			<div className="static" />
			<If condition={process.browser}>
				{/* images/static.gif will exist for @browser but not @node */}
				<img src={import('<href>./images/static.gif')} />
				<img src={import('<static>./images/static.gif')} />
			</If>
			<img src={import(`<static>./images/dynamic/${Math.round(Math.random())}.gif`)} />
		</Fragment>
	);
}

module.exports = (async () => {
	if (process.browser) {
		const html = ReactDOMServerBrowser.renderToString(<RequestAttributes />);
		document.body.innerHTML += html;
		return html;
	} else {
		return ReactDOMServer.renderToString(<RequestAttributes />);
	}
})();
