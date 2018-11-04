// eslint-disable-next-line import/no-unresolved
import { ObjectMap } from '@remote-modules/types';

const DESCRIPTOR_KEYS = Object.freeze([
	'value',
	'get',
	'set',
	'configurable',
	'enumerable',
	'writable'
]);

export interface BaseDescriptor {
	configurable?: boolean;
	enumerable?: boolean;
	writable?: boolean;
}

export interface StaticDescriptor extends BaseDescriptor {
	value: any;
}

export interface DynamicDescriptor extends BaseDescriptor {
	get: () => any;
	set?: () => any;
}

export type Descriptor = StaticDescriptor | DynamicDescriptor;

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
export default function defineProperties(
	object: object,
	props: ObjectMap<any>,
	descriptorDefaults = {}
) {
	const defaultDescriptor: BaseDescriptor = { enumerable: false, ...descriptorDefaults };
	Object.defineProperties(
		object,
		[...Object.keys(props), ...Object.getOwnPropertySymbols(props)].reduce(
			(acc: ObjectMap<Descriptor>, key) => {
				// @ts-ignore: TypeScript doesn't support symbol as an index type (https://git.io/fxhc9)
				const value = props[key];
				const isPartial =
					value &&
					typeof value === 'object' &&
					DESCRIPTOR_KEYS.some(k => Object.hasOwnProperty.call(value, k));
				// @ts-ignore: TypeScript doesn't support symbol as an index type (https://git.io/fxhc9)
				acc[key] = { ...defaultDescriptor, ...(isPartial ? value : { value }) };
				return acc;
			},
			{}
		)
	);
	return object;
}
