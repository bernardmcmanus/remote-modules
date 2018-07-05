export function matches(target, query) {
	let result = true;
	for (const [key, value] of Object.entries(query)) {
		if (target[key] !== value) {
			result = false;
			break;
		}
	}
	return result;
}

export function isPrimitive(value) {
	return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

export function isPlainObject(value) {
	return Boolean(
		value && (Object(value).constructor === Object || Object.getPrototypeOf(value) === null)
	);
}

export function mapObject(target, fn) {
	return (
		target &&
		Object.entries(target).reduce((acc, [key, value]) => {
			acc[key] = fn(value, key);
			return acc;
		}, Array.isArray(target) ? [] : {})
	);
}

export function pickBy(target, fn) {
	return (
		target &&
		Object.entries(target).reduce((acc, [key, value]) => {
			if (fn(value, key)) {
				acc[key] = value;
			}
			return acc;
		}, Array.isArray(target) ? [] : {})
	);
}

export function pickDefined(target) {
	return pickBy(target, value => value !== undefined);
}

export function omit(target, keys) {
	return pickBy(target, (value, key) => !keys.includes(key));
}

export function stripBounding(value, pattern) {
	return value && value.replace(new RegExp(`^${pattern}|${pattern}$`), '');
}

export function isAbsoluteURL(path) {
	return Boolean(path && /^(\w+:)?\/\//.test(path));
}

export function isDataURL(path) {
	return Boolean(path && /^data:\w+/i.test(path));
}

export function isAbsolutePath(path) {
	return Boolean(path && /^\/([^/]|$)/.test(path));
}

export function isRelativePath(path) {
	return Boolean(path && /^\.{1,2}(?:\/|$)/.test(path));
}
