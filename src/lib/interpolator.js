import get from './helpers/get';

export default function Interpolator(pattern = /\{([^}]+)\}/g) {
	return (string, object) => {
		const regexp = new RegExp(pattern.source, pattern.flags);
		return string.replace(regexp, (match, key) => {
			const value = get(object, key.split('.'));
			return value !== undefined ? value : match;
		});
	};
}
