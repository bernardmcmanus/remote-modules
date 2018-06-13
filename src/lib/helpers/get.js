/**
 * Returns the value at {@code path} at {@code target}, or {@code undefined} if it does not exist
 * @since 0.1.0
 *
 * @param {object} target - The target object
 * @param {array} path - The path to get
 * @return {?}
 */
export default function get(target, path) {
	return path.reduce(
		(value, key) => (value !== null && value !== undefined ? value[key] : undefined),
		target
	);
}
