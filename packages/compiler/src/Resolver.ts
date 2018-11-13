import fs, { Stats } from 'fs';
import Path from 'path';

import resolve from 'resolve';
import merge from 'deepmerge';
import { asyncify, promisify, defineProperties, get } from '@remote-modules/helpers';
import { ObjectMap } from '@remote-modules/helpers/dist/types';

const resolveAsync = promisify(resolve);
const statAsync = promisify(fs.stat, fs);

type NodeCallback = (err: Error | null, result: any) => any;

export interface ResolverOptions {
	core?: ObjectMap<string>;
	extensions?: string[] | ReadonlyArray<string>;
	mainFields?: string[] | ReadonlyArray<string>;
	moduleDirs?: string[] | ReadonlyArray<string>;
	rootDir?: string;
	baseDir?: string;
	isFile?: (path: string) => boolean;
	isFileAsync?: (path: string) => Promise<boolean>;
	packageFilter?: (pkg: ObjectMap<string>) => ObjectMap<string>;
}

export default class Resolver {
	static core = get(resolve, ['core']);

	static extensions = Object.freeze(['.js', '.mjs', '.json']);

	static mainFields = Object.freeze(['main']);

	static moduleDirs = Object.freeze(['node_modules']);

	readonly options: ResolverOptions = {};

	constructor(opts: ResolverOptions) {
		const core = merge.all([{}, Resolver.core, opts.core].filter(Boolean)) as ObjectMap<string>;
		defineProperties(this, {
			options: {
				extensions: Resolver.extensions,
				mainFields: Resolver.mainFields,
				moduleDirs: Resolver.moduleDirs,
				rootDir: process.cwd(),
				packageFilter: this.packageFilter,
				...opts,
				isFile: this.wrapFsCheck(opts.isFile || this.isFile),
				isFileAsync: this.wrapFsCheckAsync(opts.isFileAsync || this.isFileAsync),
				core
			}
		});
	}

	wrapFsCheck(fn: (value: string) => boolean) {
		return (value: string) => this.checkConstrained(value) && fn(value);
	}

	wrapFsCheckAsync(fn: (value: string, cb: NodeCallback) => Promise<boolean>) {
		return async (value: string, cb: NodeCallback) => {
			if (!this.checkConstrained(value)) {
				return cb(null, false);
			}
			return fn(value, cb);
		};
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
			const stat = (await statAsync(file)) as Stats;
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
		for (const field of this.options.mainFields as string[]) {
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
		return file.startsWith(this.options.rootDir as string);
	}

	isCore(request: string) {
		return Boolean((this.options.core as ObjectMap<string>)[request]);
	}

	sync(request: string, baseDir: string = this.options.rootDir as string) {
		if (this.isCore(request)) {
			return request;
		}
		const { moduleDirs, ...other } = this.options;
		return resolve.sync(request, { ...other, basedir: baseDir, moduleDirectory: moduleDirs });
	}

	async async(request: string, baseDir: string = this.options.rootDir as string) {
		if (this.isCore(request)) {
			return request;
		}
		const { moduleDirs, isFileAsync, ...other } = this.options;
		return resolveAsync(request, {
			...other,
			isFile: isFileAsync,
			basedir: baseDir,
			moduleDirectory: moduleDirs
		});
	}
}
