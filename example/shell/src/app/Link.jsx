import React from 'react';
import t from 'prop-types';
import cc from 'classcat';

export default function Link({ children, className, href }, { history }) {
	const active = href === history.location.pathname;
	return (
		<a className={cc(['link', { active }, className])} href={href}>
			{children}
		</a>
	);
}

Link.propTypes = {
	children: t.node.isRequired,
	className: t.string,
	href: t.string
};

Link.contextTypes = {
	history: t.object.isRequired
};
