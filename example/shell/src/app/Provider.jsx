import React, { PureComponent } from 'react';
import t from 'prop-types';

export default class Provider extends PureComponent {
	static propTypes = {
		children: t.node.isRequired
	};

	state = this.props;

	render() {
		return this.state.children;
	}
}
