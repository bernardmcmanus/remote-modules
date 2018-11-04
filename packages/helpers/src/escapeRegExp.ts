/**
 * Escapes certain characters in a string to be passed to the RegExp constructor
 * @since 0.1.0
 */
export default function escapeRegExp(string: string) {
	return string.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
}
