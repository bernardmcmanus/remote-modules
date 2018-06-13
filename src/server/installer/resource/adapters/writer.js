import Path from 'path';

import { mkdirpAsync, writeFileAsync } from '../../../../lib/helpers/fs';

export default class Writer {
	constructor({ encoding = 'utf8', extension = '.js' } = {}) {
		this.encoding = encoding;
		this.extension = extension;
	}

	async apply(path, output) {
		await mkdirpAsync(Path.dirname(path));
		return writeFileAsync(path, output, this.encoding);
	}
}
