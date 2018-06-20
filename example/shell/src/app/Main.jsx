import React, { Fragment, PureComponent } from 'react';
import Helmet from 'react-helmet';
import t from 'prop-types';

import Link from './Link';

export default class Main extends PureComponent {
	static propTypes = {
		children: t.node
	};

	static childContextTypes = {
		history: t.object.isRequired
	};

	getChildContext() {
		return {
			history: this.props.history
		};
	}

	render() {
		return (
			<Fragment>
				<Helmet titleTemplate="%s | remote-modules">
					<title>Home</title>
				</Helmet>
				<header>
					<nav>
						<Link href="/">Home</Link>
						<Link href="/a">Fragment A</Link>
						<Link href="/b">Fragment B</Link>
					</nav>
				</header>
				<main>{this.props.children}</main>
			</Fragment>
		);
	}
}
