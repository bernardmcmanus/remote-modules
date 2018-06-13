import fs from 'fs';

import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import promisify from './promisify';

export const rimrafAsync = promisify(rimraf);

export const mkdirpAsync = promisify(mkdirp);

export const statAsync = promisify(fs.stat, fs);

export const readFileAsync = promisify(fs.readFile, fs, {
	defaults: { 1: 'utf8' }
});

export const writeFileAsync = promisify(fs.writeFile, fs);

export function readJSONAsync(path) {
	return readFileAsync(path).then(JSON.parse);
}

export function writeJSONAsync(path, data, opts) {
	return writeFileAsync(path, JSON.stringify(data, null, 2), opts);
}
