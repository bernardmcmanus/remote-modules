import { ObjectMap } from './types';

/**
 * Retuns a new object composed of the picked properties
 * @since 0.1.0
 */
export default function pickBy(target: any, fn: (value: any, key: number | string) => boolean) {
	return (
		target &&
		Object.entries(target).reduce((acc: ObjectMap<any>, [key, value]) => {
			if (fn(value, key)) {
				acc[key] = value;
			}
			return acc;
		}, Array.isArray(target) ? [] : {})
	);
}
