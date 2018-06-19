import React, { PureComponent } from 'react';
import Helmet from 'react-helmet';
import t from 'prop-types';
import cc from 'classcat';

import './styles';

export default class Image extends PureComponent {
	static propTypes = {
		className: t.string,
		onLoad: t.func,
		onError: t.func,
		preload: t.bool,
		size: t.string,
		src: t.string.isRequired
	};

	static defaultProps = {
		onLoad: () => {},
		onError: () => {},
		preload: false,
		size: 'contain'
	};

	state = {
		loaded: false
	};

	onLoad = () => {
		this.setState({ loaded: true });
		this.props.onLoad();
	};

	onError = () => {
		this.props.onError();
	};

	render() {
		const { className, preload, size, src } = this.props;
		const { loaded } = this.state;
		return (
			<div
				className={cc(['Image', { loaded }, className])}
				style={{
					backgroundImage: loaded ? `url(${src})` : undefined,
					backgroundSize: size,
					backgroundPosition: size === 'contain' ? 'center top' : 'center'
				}}
			>
				<If condition={preload}>
					<Helmet>
						<link rel="preload" as="image" href={src} />
					</Helmet>
				</If>
				<img
					src={src}
					ref={img => {
						if (img && img.complete && !loaded) {
							this.onLoad();
						}
					}}
					onLoad={this.onLoad}
					onError={this.onError}
				/>
			</div>
		);
	}
}
