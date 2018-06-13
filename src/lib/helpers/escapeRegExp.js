/**
 * Escapes certain characters in a string to be passed to the {@code RegExp} constructor
 * @since 0.1.0
 * @see [escapeRegExp.test.js]{@link test/escapeRegExp.test.js}
 *
 * @param {string} string - The string to escape
 * @return {string}
 */
export default function escapeRegExp(string) {
	return string.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
}
