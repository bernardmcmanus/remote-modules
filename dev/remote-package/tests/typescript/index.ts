import React, { Fragment, ReactElement, SFCElement } from 'react';
import ReactDOMServer from 'react-dom/server';

import { Stateful, Stateless, TSXComponentProps } from './component';

const stateful: ReactElement<TSXComponentProps> = React.createElement(Stateful, { value: 'test' });

const stateless: SFCElement<TSXComponentProps> = React.createElement(Stateless, { value: 'test' });

module.exports = ReactDOMServer.renderToString(
	React.createElement(Fragment, null, stateful, stateless)
);
