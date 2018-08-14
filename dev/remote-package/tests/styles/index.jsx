import 'raf/polyfill';

import React, { Fragment } from 'react';

import './styles.css';
import './styles.less';
import './styles.sass';
import './styles.scss';

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
			<div className="sass">
				<h2>This is styled with SASS!</h2>
				<div className="logo" />
			</div>
			<div className="scss">
				<h2>This is styled with SCSS!</h2>
				<div className="logo" />
			</div>
		</Fragment>
	);
}

module.exports = async () => {
	if (process.browser) {
		const ReactDOMServer = await import('react-dom/server.browser');
		const html = ReactDOMServer.renderToString(<Styles />);
		let main = document.querySelector('#main');
		if (!main) {
			main = document.createElement('div');
			main.id = 'main';
			document.body.appendChild(main);
		}
		main.innerHTML = html;
		return html;
	} else {
		const ReactDOMServer = await import('react-dom/server');
		return ReactDOMServer.renderToString(<Styles />);
	}
};
