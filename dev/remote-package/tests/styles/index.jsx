import 'raf/polyfill';

import React, { Fragment } from 'react';

import './styles.css';
import './styles.less';

function Styles() {
	return (
		<Fragment>
			<div className="rectangle css">
				<h2>This is styled with CSS!</h2>
				<div className="logo" />
			</div>
			<div className="less">
				<h2>This is styled with LESS!</h2>
				<div className="logo" />
			</div>
			<img src={import('<href>./images/static.gif')} />
			<img src={import(`<href>./images/dynamic/${Math.round(Math.random())}.gif`)} />
		</Fragment>
	);
}

module.exports = (async () => {
	if (process.browser) {
		const ReactDOMServer = await import('react-dom/server.browser');
		const html = ReactDOMServer.renderToString(<Styles />);
		document.body.innerHTML += html;
		return html;
	} else {
		const ReactDOMServer = await import('react-dom/server');
		return ReactDOMServer.renderToString(<Styles />);
	}
})();
