import { ObjectMap } from '../types';

/**
 * Retuns a new object composed of the picked properties
 * @since 0.1.0
 */
export default function pick(target: any, keys: Array<number | string>) {
	return keys.reduce((acc: ObjectMap<any>, key) => {
		acc[key] = target[key];
		return acc;
	}, {});
}
