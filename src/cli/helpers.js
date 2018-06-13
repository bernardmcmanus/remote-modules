export function normalizeArrayOption(array = []) {
	return array
		.join(',')
		.split(',')
		.reduce((acc, value) => [...acc, ...value.split(/,\s?/)], [])
		.filter(Boolean);
}

function isTrueNumber(value) {
	return (
		Boolean((value && typeof value === 'string') || typeof value === 'number') &&
		!Number.isNaN(Number(value))
	);
}

export function toPrimitive(value) {
	const stringValue = String(value);
	switch (true) {
		case stringValue === 'null':
			return null;
		case stringValue === 'undefined':
			return undefined;
		case stringValue === 'true':
		case stringValue === 'false':
			return stringValue === 'true';
		case isTrueNumber(stringValue):
			return Number(value);
		case typeof value === 'object':
			return Object.entries(value).reduce((acc, [k, v]) => {
				acc[k] = toPrimitive(v);
				return acc;
			}, new value.constructor());
		default:
			return value;
	}
}
