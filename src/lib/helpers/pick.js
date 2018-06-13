/**
 * Retuns a new object composed of the picked properties
 * @since 0.1.0
 *
 * @param {object} target - The target object
 * @param {array} keys - The keys to pick
 * @return {object}
 */
export default function pick(target, keys) {
	return keys.reduce((acc, key) => {
		acc[key] = target[key];
		return acc;
	}, {});
}
