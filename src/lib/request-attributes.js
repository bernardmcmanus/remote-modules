import { pickBy } from './helpers';

function getAttributesRegExp() {
	return /(?:<([^>]+)>)/;
}

export function formatAttributes(attributes) {
	const keys = Object.keys(pickBy(attributes, Boolean));
	return keys.length ? `<${keys.join(',')}>` : undefined;
}

export function parseAttributes(requestValue) {
	const attributes = {};
	const [, attributesList] = requestValue.match(getAttributesRegExp()) || [];
	if (attributesList) {
		attributesList.split(',').forEach(attribute => {
			const [, key, value = true] = attribute.match(/^([^=]+)(?:=(.+)|$)/);
			attributes[key] = value;
		});
	}
	return {
		list: attributesList,
		attributes: {
			...attributes,
			href: (attributes.href === undefined && attributes.static) || attributes.href
		}
	};
}

export function stripAttributes(requestValue) {
	return requestValue.replace(getAttributesRegExp(), '');
}
