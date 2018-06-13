import React, { Fragment } from 'react';
import ReactDOMServer from 'react-dom/server';
import Helmet from 'react-helmet';
import styled from 'styled-components';
import t from 'prop-types';

function Image({ url, ...other }) {
	return (
		<Fragment>
			<If condition={typeof Helmet === 'function'}>
				<Helmet>
					<link rel="prefetch" href={url} />
				</Helmet>
			</If>
			<div {...other} />
		</Fragment>
	);
}

Image.propTypes = {
	alt: t.string.isRequired,
	title: t.string.isRequired,
	url: t.string.isRequired
};

const StyledImage = typeof styled === 'function'
	? styled(Image)`
			height: 100%;
			max-width: 500px;
			margin: auto;
			background-image: ${({ url }) => `url(${url})`};
			background-position: center top;
			background-repeat: no-repeat;
			background-size: cover;
		`
	: Image;

StyledImage.defaultProps = {
	className: 'image'
};

export default ReactDOMServer.renderToString(
	<StyledImage
		alt="test"
		title="test"
		url="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
	/>
);
