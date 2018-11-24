import { GenericFunction, ObjectMap, Primitive, ValueOf } from '../types';

export type Keys = Array<number | string> | ReadonlyArray<number | string>;

export type ReturnType<T> = T extends (Primitive | GenericFunction | any[])
	? T
	: ObjectMap<ValueOf<T>>;

/**
 * Retuns a new object composed of the picked properties
 * @since 0.1.0
 */
export default function pick<T>(target: T, keys: Keys): ReturnType<T> {
	if (target && typeof target === 'object' && !Array.isArray(target)) {
		return <any>(keys as any[]).reduce((acc: ObjectMap<any>, key) => {
			acc[key] = (target as ObjectMap<any>)[key];
			return acc;
		}, {});
	}
	return <any>target;
}
