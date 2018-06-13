import Path from 'path';
import Url, { URLSearchParams } from 'url';

import { isRelativePath, pickDefined } from './helpers';

export function getResourcePathFromID(id) {
	return `${isRelativePath(id) ? ':' : ''}${id}`;
}

export function assembleResourceURL(base, id, query) {
	const baseURL = typeof base === 'string' ? Url.parse(base) : base;
	const pathname = Path.join(baseURL.pathname, '/_', getResourcePathFromID(id));
	const search = query && new URLSearchParams(pickDefined(query)).toString();
	return Url.format({ ...baseURL, pathname, search });
}
