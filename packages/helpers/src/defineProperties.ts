import { ObjectMap } from '../types';

const DESCRIPTOR_KEYS = Object.freeze([
	'value',
	'get',
	'set',
	'configurable',
	'enumerable',
	'writable'
]);

export type BaseDescriptor = {
	configurable?: boolean;
	enumerable?: boolean;
	writable?: boolean;
};

export type ShorthandDescriptorPartial = ObjectMap<any>;

export type StaticDescriptorPartial = {
	value: any;
};

export type DynamicDescriptorPartial = {
	get: () => any;
	set?: () => any;
};

export type Descriptor = (StaticDescriptorPartial | DynamicDescriptorPartial) & BaseDescriptor;

/**
 * Convenience wrapper around [Object.defineProperties]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties}
 * @see [Object.defineProperties | MDN]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties}
 * @since 0.1.0
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
export default function defineProperties<
	T,
	U extends ShorthandDescriptorPartial | StaticDescriptorPartial | DynamicDescriptorPartial
>(target: T, props: U, descriptorDefaults = {}): T & U {
	const defaultDescriptor: BaseDescriptor = { enumerable: false, ...descriptorDefaults };
	Object.defineProperties(
		target,
		[...Object.keys(props), ...Object.getOwnPropertySymbols(props)].reduce(
			(acc: ObjectMap<Descriptor>, key) => {
				// TypeScript doesn't support symbol as an index type (https://git.io/fxhc9)
				const value = (props as ObjectMap<any>)[key as string];
				const isPartial =
					value &&
					typeof value === 'object' &&
					DESCRIPTOR_KEYS.some(k => Object.hasOwnProperty.call(value, k));
				// TypeScript doesn't support symbol as an index type (https://git.io/fxhc9)
				acc[key as string] = { ...defaultDescriptor, ...(isPartial ? value : { value }) };
				return acc;
			},
			{}
		)
	);
	return <any>target;
}
