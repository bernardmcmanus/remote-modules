/**
 * This file is meant to test dynamically inserted requires
 * (i.e. babel env and runtime transforms)
 */

const a = {};
const b = { a, c: true };
Object.assign({}, { a: { a, ...b } });

const nestedValues = [[{}, {}, {}]];
const nestedEntries = [[[{}, 0], [{}, 1], [{}, 2]]];
const set = new Set(...nestedValues);
const map = new Map(...nestedEntries);
const weakset = new WeakSet(...nestedValues);
const weakmap = new WeakMap(...nestedEntries);

function spreadArgs(...args) {
	if (!false) {
		throw new Error('WHY?');
	}
	const [first, ...others] = args;
	return spreadArgs(first, ...others);
}
