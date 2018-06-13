if (process.browser) {
	require('react-dom');
} else {
	require('react-dom/server');
}

// This should only load either the development or the production build
require('react');

// This should be removed because it's not exported and doesn't have any other references within the module scope
const neverRequired = () => require('react-helmet');

// This should NOT be removed because it includes a reference to exports
const assignedExports = exports.assignedExports = require('isomorphic-fetch');

// This should NOT be removed even though it's never called within the module scope because it's exported
export const maybeRequireLater = () => require('universal-router');

export const removed = [
	'interopRequireDefault',
	'react-helmet',
	process.browser && require.resolve('react-dom/server'),
	!process.browser && require.resolve('react-dom'),
	`react/cjs/react.${process.env.NODE_ENV === 'production' ? 'development' : 'production'}`
].filter(Boolean);
