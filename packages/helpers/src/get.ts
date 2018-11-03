/**
 * Returns the value at path of target, or undefined if it doesn't exist
 * @since 0.1.0
 */
export default function get(target: any, path: Array<number | string>) {
	return path.reduce(
		(value, key) => (value !== null && value !== undefined ? value[key] : undefined),
		target
	);
}
