import Path from 'path';
import fs, { Stats } from 'fs';

import hash from 'object-hash';
import { once, pick, promisify } from '@remote-modules/helpers';

import Hashable, { Initializer as HashableInitializer } from './Hashable';

const readFileAsync = (<unknown>promisify(fs.readFile, fs)) as (path: string) => Promise<Buffer>;
const statAsync = (<unknown>promisify(fs.stat, fs)) as (path: string) => Promise<Stats>;

export type ResourceOptions = {
	rootDir: string;
};

export type ResourceInitializer = {
	id: string;
	source?: HashableInitializer<Buffer>;
	options: ResourceOptions;
};

export default class Resource {
	static async getStatsChecksum(path: string) {
		const stats = await statAsync(path);
		const pickedStats = pick(stats, ['ctime', 'mtime', 'ino', 'size']);
		return hash(pickedStats, { algorithm: 'md5' });
	}

	readonly id: ResourceInitializer['id'];
	readonly options: ResourceInitializer['options'];
	readonly origin: string;
	source: Hashable<Buffer>;

	constructor({ id, source, options }: ResourceInitializer) {
		this.id = id;
		this.options = options;
		this.origin = Path.join(options.rootDir, this.id);

		this.source = new Hashable(source, {
			checksum: () => Resource.getStatsChecksum(this.origin),
			value: () => readFileAsync(this.origin)
		});
	}

	load = once(async () => {
		await this.source.load();
	});

	toJSON() {
		return pick(this, ['id', 'source']);
	}
}
