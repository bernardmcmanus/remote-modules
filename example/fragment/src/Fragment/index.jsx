import React from 'react';
import Helmet from 'react-helmet';

import Image from '../components/Image';

import './styles';

export default function Fragment() {
	const title = `Fragment ${process.env.FRAGMENT_NAME.toUpperCase()}`;
	return (
		<div className="Fragment">
			<Helmet>
				<title>{title}</title>
			</Helmet>
			<h1>{title}</h1>
			<Image preload src={import(`<href>../../static/${process.env.FRAGMENT_NAME}.png`)} />
		</div>
	);
}
