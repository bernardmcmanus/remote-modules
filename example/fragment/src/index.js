import React from 'react';

import Fragment from './Fragment';

function fetchAsyncData() {
	return new Promise(resolve => {
		setTimeout(() => resolve({}));
	});
}

module.exports = async () => React.createElement(Fragment, await fetchAsyncData());
