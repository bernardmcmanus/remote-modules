import React from 'react';

import './relay';
import './Dummy';

export default function Test() {
	return (
		<div
			className="test"
			onClick={async () => {
				await new Promise(resolve => setTimeout(resolve));
			}}
		/>
	);
}
