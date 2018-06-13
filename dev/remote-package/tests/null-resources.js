const assert = require('assert');

assert.throws(
	() => {
		// Null resource (Assignment)
		const nothing = require('no-exist');
	},
	/no-exist/
);

assert.throws(
	() => {
		// Null resource (Expression)
		require('no-exist');
	},
	/no-exist/
);

function noExistNeverRequired() {
	// Null resource (Not required)
	require('no-exist/never-required');
}

// This should be rewritten by NullMiddleware
require('react');

module.exports = () => require('no-exist/exported');
