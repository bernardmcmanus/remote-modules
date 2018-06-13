import fs from 'fs';
import Path from 'path';

import moduleResolver from 'resolve';

import asyncify from './helpers/asyncify';
import promisify from './helpers/promisify';
import noop from './helpers/noop';
import { statAsync } from './helpers/fs';

const wrappedAsyncResolver = promisify(moduleResolver);

export const defaultCore = moduleResolver.core;

export const defaultExtensions = Object.freeze(['.js', '.jsx', '.mjs', '.es', '.es6', '.json']);

export const defaultMainFields = Object.freeze(['main']);

export const defaultModuleDirs = Object.freeze(['node_modules']);

export function isCore(request) {
	return Boolean(moduleResolver.isCore(request));
}

/**
 * If start !== end, return the intermediate paths spanning [start...end] (inclusive)
 * If start === end, return [start]
 * @param {string} start
 * @param {string} [end = start]
 * @return {string[]}
 */
export function diffPaths(start, end = start) {
	const paths = [];
	if (start === end) {
		paths[0] = start;
	} else {
		const relative = Path.relative(start, end);
		const diff = Path.join(relative && '/', relative);
		const segments = diff.split('/');
		const size = segments.length;
		for (let i = 0; i < size; i += 1) {
			paths[i] = Path.join(start, ...segments.slice(0, size - i));
		}
	}
	return paths;
}

function doResolve(resolveFn, args, checkFile) {
	const request = args.shift();
	const options = args.pop() || {};
	const {
		core = defaultCore,
		mainFields = defaultMainFields,
		moduleDirs = defaultModuleDirs,
		rootDir = process.cwd(),
		baseDir = rootDir,
		isFile = checkFile,
		...otherOpts
	} = options;

	const resolverOpts = {
		extensions: defaultExtensions,
		paths: diffPaths(rootDir, baseDir),
		basedir: baseDir,
		moduleDirectory: moduleDirs,
		preserveSymlinks: false,
		packageFilter: pkg => {
			let result = pkg;
			for (const field of mainFields) {
				if (field && pkg[field]) {
					let main = pkg[field];
					if (pkg.main && typeof main === 'object') {
						const normalizedMain = Object.entries(main).reduce(
							(acc, [key, value]) => ({ ...acc, [Path.normalize(key)]: value }),
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
		},
		isFile: (file, cb = noop) => {
			const constrainedFile = file.startsWith(rootDir) ? file : null;
			return constrainedFile ? isFile(constrainedFile, cb) : cb(null, false);
		},
		...otherOpts
	};

	return core[request] ? request : resolveFn(request, resolverOpts);
}

export function resolveSync(...args) {
	return doResolve(moduleResolver.sync, args, file => {
		let result = false;
		try {
			// eslint-disable-next-line no-sync
			result = fs.statSync(file).isFile();
		} catch (err) {
			if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') {
				throw err;
			}
		}
		return result;
	});
}

export function resolveAsync(...args) {
	return doResolve(
		wrappedAsyncResolver,
		args,
		asyncify(async file => {
			let result = false;
			try {
				const stat = await statAsync(file);
				result = stat.isFile();
			} catch (err) {
				if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') {
					throw err;
				}
			}
			return result;
		})
	);
}
