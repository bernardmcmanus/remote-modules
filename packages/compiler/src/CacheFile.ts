import Path from 'path';
import fs from 'fs';

import mkdirp from 'mkdirp';
import { pick, promisify } from '@remote-modules/helpers';
import { ObjectMap } from '@remote-modules/helpers/dist/types';

import pkg from '../package.json';

const readFileAsync = (<unknown>promisify(fs.readFile, fs, {
	defaults: { 1: 'utf8' }
})) as (path: string) => Promise<string>;

const writeFileAsync = promisify(fs.writeFile, fs);

const mkdirpAsync = promisify(mkdirp);

export type CachedResource = {
	id: string;
};

export type CacheFileContent = {
	version: string;
	resources: ObjectMap<CachedResource>;
};

export default class CacheFile {
	readonly scope: string;
	readonly dir: string;
	readonly path: string;
	version: CacheFileContent['version'] = pkg.version;
	resources: CacheFileContent['resources'] = {};

	constructor(scope: string, dir = '.remote') {
		this.scope = scope;
		this.dir = Path.resolve(dir);
		this.path = Path.join(this.dir, `${scope}.json`);
	}

	getContent(): CacheFileContent {
		return <any>pick(this, ['version', 'resources']);
	}

	async load() {
		let content = this.getContent();
		try {
			const json = await readFileAsync(this.path);
			content = JSON.parse(json);
		} catch (err) {
			/* istanbul ignore next */
			if (err.code !== 'ENOENT') {
				throw err;
			}
		}
		// FIXME: Check semver range or use a dedicated cachefile version
		if (content.version !== this.version) {
			content = { version: this.version, resources: {} };
		}
		Object.assign(this, content);
	}

	async commit() {
		const json = JSON.stringify(this.getContent(), null, 2);
		await mkdirpAsync(this.dir);
		return writeFileAsync(this.path, json);
	}
}
