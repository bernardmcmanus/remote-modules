import fs, { Stats } from 'fs';
import Path from 'path';

import resolve, { AsyncOpts } from 'resolve';
import merge from 'deepmerge';
import { asyncify, promisify, defineProperties, get, pickBy } from '@remote-modules/helpers';
import { ObjectMap, NodeCallback } from '@remote-modules/helpers/dist/types';

const resolveAsync = (<unknown>promisify(resolve)) as (
	request: string,
	opts?: AsyncOpts
) => Promise<string>;
const statAsync = (<unknown>promisify(fs.stat, fs)) as (path: string) => Promise<Stats>;

export interface ResolverOptions {
	rootDir: string;
	core?: ObjectMap<string>;
	extensions?: string[] | ReadonlyArray<string>;
	mainFields?: string[] | ReadonlyArray<string>;
	moduleDirs?: string[] | ReadonlyArray<string>;
	isFile?: (path: string) => boolean;
	isFileAsync?: (path: string) => Promise<boolean>;
	packageFilter?: (pkg: ObjectMap<string>) => ObjectMap<string>;
}

export default class Resolver {
	static core = get(resolve, ['core']);

	static extensions = Object.freeze(['.js', '.mjs', '.json']);

	static mainFields = Object.freeze(['main']);

	static moduleDirs = Object.freeze(['node_modules']);

	readonly options: ResolverOptions;

	constructor({ rootDir, ...other }: ResolverOptions) {
		this.options = {
			rootDir,
			extensions: Resolver.extensions,
			mainFields: Resolver.mainFields,
			moduleDirs: Resolver.moduleDirs,
			packageFilter: this.packageFilter,
			...pickBy(other, value => value !== undefined),
			isFile: this.wrapFsCheck(other.isFile || this.isFile),
			isFileAsync: this.wrapFsCheckAsync(other.isFileAsync || this.isFileAsync),
			core: merge.all([{}, Resolver.core, other.core].filter(Boolean)) as ObjectMap<string>
		};

		defineProperties(this, {
			options: this.options
		});
	}

	get extensions() {
		return this.options.extensions as string[];
	}

	get mainFields() {
		return this.options.mainFields as string[];
	}

	get moduleDirs() {
		return this.options.moduleDirs as string[];
	}

	get rootDir() {
		return this.options.rootDir;
	}

	wrapFsCheck<T extends Function = (value: string) => boolean>(fn: T): T {
		return <any>((value: string) => this.checkConstrained(value) && fn(value));
	}

	wrapFsCheckAsync<T extends Function = (value: string, cb: NodeCallback) => Promise<boolean>>(
		fn: T
	): T {
		return <any>(async (value: string, cb: NodeCallback) => {
			if (!this.checkConstrained(value)) {
				return cb(null, false);
			}
			return fn(value, cb);
		});
	}

	isFile = (file: string) => {
		let result;
		try {
			// eslint-disable-next-line no-sync
			result = fs.statSync(file).isFile();
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
			result = false;
		}
		return result;
	};

	isFileAsync = asyncify(async (file: string) => {
		let result;
		try {
			const stat = await statAsync(file);
			result = stat.isFile();
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
			result = false;
		}
		return result;
	});

	packageFilter = (pkg: ObjectMap<string>) => {
		let result = pkg;
		for (const field of this.mainFields) {
			if (field && pkg[field]) {
				let main = pkg[field];
				if (pkg.main && typeof main === 'object') {
					const normalizedMain: ObjectMap<string> = Object.entries(main).reduce(
						(acc: ObjectMap<string>, [key, value]: [string, any]) => {
							acc[Path.normalize(key)] = value;
							return acc;
						},
						{}
					);
					main = normalizedMain[Path.normalize(pkg.main)];
				}
				if (typeof main === 'string') {
					result = { ...pkg, main };
					break;
				}
			}
		}
		return result;
	};

	checkConstrained(file: string) {
		return file.startsWith(this.rootDir);
	}

	isCore(request: string) {
		return Boolean((this.options.core as ObjectMap<string>)[request]);
	}

	sync(request: string, baseDir: string = ''): string {
		if (this.isCore(request)) {
			return request;
		}
		const { moduleDirs, rootDir, ...other } = this.options;
		const basedir = Path.resolve(rootDir, baseDir);
		return resolve.sync(request, { ...other, basedir, moduleDirectory: moduleDirs });
	}

	async async(request: string, baseDir: string = ''): Promise<string> {
		if (this.isCore(request)) {
			return request;
		}
		const { isFileAsync, moduleDirs, rootDir, ...other } = this.options;
		const basedir = Path.resolve(rootDir, baseDir);
		return resolveAsync(request, {
			...other,
			basedir,
			isFile: isFileAsync,
			moduleDirectory: moduleDirs
		}) as Promise<string>;
	}
}
