import { ReturnType } from './pick';
import { ObjectMap } from '../types';

type Predicate = (value: any, key: number | string) => boolean;

/**
 * Retuns a new object composed of the picked properties
 * @since 0.1.0
 */
export default function pickBy<T>(target: T, fn: Predicate): ReturnType<T> {
	if (target && typeof target === 'object' && !Array.isArray(target)) {
		return <any>Object.entries(target).reduce(
			(acc: ObjectMap<any>, [key, value]: [string, any]) => {
				if (fn(value, key)) {
					acc[key] = value;
				}
				return acc;
			},
			{}
		);
	}
	return <any>target;
}
