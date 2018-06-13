const assert = require('assert');

// Declaration w/o assignment
let process;

// Multiple declarators under single declaration
const foo = 'bar',
global = null;

// Function declaration
function Buffer() {
	return 'test';
}

assert.equal(process, undefined);
assert.equal(global, null);
assert.equal(Buffer(), 'test');

module.exports = () => ({
	normal,
	external,
	reference,
	numericLiteral,
	booleanLiteral,
	stringLiteral
});
