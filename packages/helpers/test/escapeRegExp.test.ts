import assert from 'assert';

import { escapeRegExp } from '../src';

describe('escapeRegExp', () => {
	it('should escape certain characters in a string', () => {
		const input = ' \\ ^ $ * + ? . ( ) | { } [ ] ';
		const output = escapeRegExp(input);
		input
			.split(' ')
			.filter(Boolean)
			.forEach(c => {
				const escaped = `\\${c}`;
				assert(output.includes(` ${escaped}`), `Expected output to include ${escaped}`);
			});
	});
});
