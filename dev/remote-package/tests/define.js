import assert from 'assert';

// process.browser is evaluated at build but it's not actually defined in node
assert.equal(process.browser, true);
assert.equal(eval('process.browser'), undefined);

module.exports = {
	eval: global.INCLUDE_LODASH_UNION ? require('lodash.union') : undefined,
	replace: process.config.variables.someNonExistentVar
};
