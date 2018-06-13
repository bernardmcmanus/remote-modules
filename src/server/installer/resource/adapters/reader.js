import { readFileAsync } from '../../../../lib/helpers/fs';

export default class Reader {
	constructor({ encoding = 'utf8' } = {}) {
		this.encoding = encoding;
	}

	apply(resource) {
		return readFileAsync(resource.origin, this.encoding);
	}
}
