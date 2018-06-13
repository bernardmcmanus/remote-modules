const DESCRIPTOR_KEYS = Object.freeze([
	'value',
	'get',
	'set',
	'configurable',
	'enumerable',
	'writable'
]);

/**
 * Convenience wrapper around [Object.defineProperties]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties}
 * @see [Object.defineProperties | MDN]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties}
 * @since 0.1.0
 *
 * @param {object} target - The target object
 * @param {object} props - Property values or descriptors
 * @param {object} [descriptorDefaults={ enumerable: false }] - Default descriptor attributes to be applied to all props
 * @return {object} target
 *
 * @example
 * defineProperties(
 * 	object,
 * 	{
 * 		key1: 'value',
 * 		key2: { value: 'value', configurable: true }
 * 		key3: { get: () => 'value' }
 * 	},
 * 	{ configurable: false }
 * );
 */
export default function defineProperties(object, props, descriptorDefaults = {}) {
	const defaultDescriptor = { enumerable: false, ...descriptorDefaults };
	Object.defineProperties(
		object,
		[...Object.keys(props), ...Object.getOwnPropertySymbols(props)].reduce((acc, key) => {
			const value = props[key];
			const isPartial =
				value &&
				typeof value === 'object' &&
				DESCRIPTOR_KEYS.some(k => Object.hasOwnProperty.call(value, k));
			acc[key] = { ...defaultDescriptor, ...(isPartial ? value : { value }) };
			return acc;
		}, {})
	);
	return object;
}
