import assert from 'assert';
import Path from 'path';

import sinon from 'sinon';
// eslint-disable-next-line import/no-extraneous-dependencies
import { asyncify } from '@remote-modules/helpers';

import Resolver from '../src/Resolver';
import { assertThrowsAsync } from './helpers';

const rootDir = Path.resolve(__dirname, '../../../packages/test-package');

describe('Resolver', () => {
	describe('sync', () => {
		it('should prefer core modules over installed packages unless otherwise specified', () => {
			const resolver = new Resolver({ core: { assert: false }, rootDir });
			// eslint-disable-next-line global-require
			const testPackageJSON = require('../../../packages/test-package/package.json');
			assert(
				testPackageJSON.dependencies.assert,
				'Expected remote-package to have assert dependency'
			);
			assert(testPackageJSON.dependencies.util, 'Expected remote-package to have util dependency');
			assert(
				!testPackageJSON.dependencies.path,
				'Expected remote-package to not have path dependency'
			);
			assert(
				resolver.sync('assert').includes('node_modules/'),
				'Expected assert to be resolved to installed package'
			);
			assert.strictEqual(
				resolver.sync('util'),
				'util',
				'Expected util to be resolved to core module'
			);
			assert.strictEqual(
				resolver.sync('path'),
				'path',
				'Expected path to be resolved to core module'
			);
		});

		it('should traverse lookup paths for local modules', () => {
			const resolver = new Resolver({ rootDir });
			assert.strictEqual(
				resolver.sync('./src/resolver'),
				Path.join(rootDir, 'src/resolver/index.js')
			);
		});

		it('should traverse lookup paths for package modules', () => {
			const resolver = new Resolver({ rootDir });
			assert.strictEqual(resolver.sync('react'), Path.join(rootDir, 'node_modules/react/index.js'));
		});

		it('should never traverse above rootDir', () => {
			const resolver = new Resolver({
				rootDir,
				isFile: file => {
					assert(file.startsWith(rootDir));
					return false;
				}
			});

			assert.throws(() => resolver.sync('react'), /Cannot find module/);
		});

		it('should traverse nested module directories', () => {
			const resolver = new Resolver({ rootDir });
			const baseDir = Path.resolve(rootDir, 'node_modules/fbjs/lib');
			const resolvedBasedir = Path.dirname(baseDir);

			const existsOnlyTop = resolver.sync('core-js/modules/_a-function', baseDir);
			const existsOnlyNested = resolver.sync('core-js/modules/$.a-function', baseDir);
			const existsBothWithBasedir = resolver.sync('core-js/modules/es6.map', baseDir);
			const existsBothSansBasedir = resolver.sync('core-js/modules/es6.map');

			assert(existsOnlyTop.startsWith(rootDir));
			assert(existsOnlyNested.startsWith(resolvedBasedir));
			assert(existsBothWithBasedir.startsWith(resolvedBasedir));
			assert(existsBothSansBasedir.startsWith(rootDir));

			assert.strictEqual(existsOnlyTop.match(/node_modules\//g).length, 1);
			assert.strictEqual(existsBothSansBasedir.match(/node_modules\//g).length, 1);
			assert.strictEqual(existsOnlyNested.match(/node_modules\//g).length, 2);
			assert.strictEqual(existsBothWithBasedir.match(/node_modules\//g).length, 2);
		});

		it('should resolve relative requests from local modules', () => {
			const resolver = new Resolver({ rootDir });
			const parent = resolver.sync('./src/resolver');
			const baseDir = Path.dirname(parent);
			const relativeRequest = '../../package';
			const resolvedRelative = resolver.sync(relativeRequest, baseDir);
			assert.throws(() => resolver.sync(relativeRequest), /Cannot find module/);
			assert.strictEqual(resolvedRelative, Path.resolve(baseDir, `${relativeRequest}.json`));
		});

		it('should resolve relative requests from package modules', () => {
			const resolver = new Resolver({ rootDir });
			const parent = resolver.sync('core-js/es6/map');
			const baseDir = Path.dirname(parent);
			const relativeRequest = '../modules/es6.map';
			const resolvedRelative = resolver.sync(relativeRequest, baseDir);
			assert.throws(() => resolver.sync(relativeRequest), /Cannot find module/);
			assert.strictEqual(resolvedRelative, Path.resolve(baseDir, `${relativeRequest}.js`));
		});

		it('should optionally resolve non-standard main fields', () => {
			const resolver = new Resolver({ rootDir });

			resolver.options.mainFields = ['browser-object'];
			assert(
				resolver.sync('.').endsWith('/index.browser.js'),
				'Failed to resolve browser-object field'
			);

			resolver.options.mainFields = ['browser', 'main'];
			assert(resolver.sync('.').endsWith('/index.browser.js'), 'Failed to resolve browser field');

			resolver.options.mainFields = ['module', 'main'];
			assert(resolver.sync('.').endsWith('/index.mjs'), 'Failed to resolve module field');

			resolver.options.mainFields = ['noexist', 'main'];
			assert(resolver.sync('.').endsWith('/index.js'), 'Failed to resolve main field');
		});

		it('should optionally resolve non-standard module directorues', () => {
			const resolver = new Resolver({
				rootDir,
				moduleDirs: ['bower_components']
			});

			const { isFile: defaultIsFile } = resolver.options;
			const spy = sinon.spy(file => {
				assert(
					!file.includes('/node_modules/'),
					'Expected file path to not include /node_modules/'
				);
				return defaultIsFile(file);
			});

			resolver.options.isFile = resolver.wrapFsCheck(spy);

			assert(
				resolver.sync('react').includes('/bower_components'),
				'Expected resolved path to include /bower_components/'
			);

			assert.strictEqual(spy.callCount, 9);
		});
	});

	describe('async', () => {
		it('should prefer core modules over installed packages unless otherwise specified', async () => {
			const resolver = new Resolver({ core: { assert: false }, rootDir });
			// eslint-disable-next-line global-require
			const testPackageJSON = require('../../../packages/test-package/package.json');
			assert(
				testPackageJSON.dependencies.assert,
				'Expected remote-package to have assert dependency'
			);
			assert(testPackageJSON.dependencies.util, 'Expected remote-package to have util dependency');
			assert(
				!testPackageJSON.dependencies.path,
				'Expected remote-package to not have path dependency'
			);
			assert(
				(await resolver.async('assert')).includes('node_modules/'),
				'Expected assert to be resolved to installed package'
			);
			assert.strictEqual(
				await resolver.async('util'),
				'util',
				'Expected util to be resolved to core module'
			);
			assert.strictEqual(
				await resolver.async('path'),
				'path',
				'Expected path to be resolved to core module'
			);
		});

		it('should traverse lookup paths for local modules', async () => {
			const resolver = new Resolver({ rootDir });
			assert.strictEqual(
				await resolver.async('./src/resolver'),
				Path.join(rootDir, 'src/resolver/index.js')
			);
		});

		it('should traverse lookup paths for package modules', async () => {
			const resolver = new Resolver({ rootDir });
			assert.strictEqual(
				await resolver.async('react'),
				Path.join(rootDir, 'node_modules/react/index.js')
			);
		});

		it('should never traverse above rootDir', async () => {
			const resolver = new Resolver({
				rootDir,
				isFileAsync: asyncify(async file => {
					assert(file.startsWith(rootDir));
					return false;
				})
			});

			return assertThrowsAsync(() => resolver.async('react'), /Cannot find module/);
		});

		it('should traverse nested module directories', async () => {
			const resolver = new Resolver({ rootDir });
			const baseDir = Path.resolve(rootDir, 'node_modules/fbjs/lib');
			const resolvedBasedir = Path.dirname(baseDir);

			const existsOnlyTop = await resolver.async('core-js/modules/_a-function', baseDir);
			const existsOnlyNested = await resolver.async('core-js/modules/$.a-function', baseDir);
			const existsBothWithBasedir = await resolver.async('core-js/modules/es6.map', baseDir);
			const existsBothSansBasedir = await resolver.async('core-js/modules/es6.map');

			assert(existsOnlyTop.startsWith(rootDir));
			assert(existsOnlyNested.startsWith(resolvedBasedir));
			assert(existsBothWithBasedir.startsWith(resolvedBasedir));
			assert(existsBothSansBasedir.startsWith(rootDir));

			assert.strictEqual(existsOnlyTop.match(/node_modules\//g).length, 1);
			assert.strictEqual(existsBothSansBasedir.match(/node_modules\//g).length, 1);
			assert.strictEqual(existsOnlyNested.match(/node_modules\//g).length, 2);
			assert.strictEqual(existsBothWithBasedir.match(/node_modules\//g).length, 2);
		});

		it('should resolve relative requests from local modules', async () => {
			const resolver = new Resolver({ rootDir });
			const parent = await resolver.async('./src/resolver');
			const baseDir = Path.dirname(parent);
			const relativeRequest = '../../package';
			const resolvedRelative = await resolver.async(relativeRequest, baseDir);
			await assertThrowsAsync(() => resolver.async(relativeRequest), /Cannot find module/);
			assert.strictEqual(resolvedRelative, Path.resolve(baseDir, `${relativeRequest}.json`));
		});

		it('should resolve relative requests from package modules', async () => {
			const resolver = new Resolver({ rootDir });
			const parent = await resolver.async('core-js/es6/map');
			const baseDir = Path.dirname(parent);
			const relativeRequest = '../modules/es6.map';
			const resolvedRelative = await resolver.async(relativeRequest, baseDir);
			await assertThrowsAsync(() => resolver.async(relativeRequest), /Cannot find module/);
			assert.strictEqual(resolvedRelative, Path.resolve(baseDir, `${relativeRequest}.js`));
		});

		it('should optionally resolve non-standard main fields', async () => {
			const resolver = new Resolver({ rootDir });

			resolver.options.mainFields = ['browser-object'];
			assert(
				(await resolver.async('.')).endsWith('/index.browser.js'),
				'Failed to resolve browser-object field'
			);

			resolver.options.mainFields = ['browser', 'main'];
			assert(
				(await resolver.async('.')).endsWith('/index.browser.js'),
				'Failed to resolve browser field'
			);

			resolver.options.mainFields = ['module', 'main'];
			assert((await resolver.async('.')).endsWith('/index.mjs'), 'Failed to resolve module field');

			resolver.options.mainFields = ['noexist', 'main'];
			assert((await resolver.async('.')).endsWith('/index.js'), 'Failed to resolve main field');
		});

		it('should optionally resolve non-standard module directorues', async () => {
			const resolver = new Resolver({
				rootDir,
				moduleDirs: ['bower_components']
			});

			const { isFileAsync: defaultIsFileAsync } = resolver.options;
			const spy = sinon.spy((file, cb) => {
				assert(
					!file.includes('/node_modules/'),
					'Expected file path to not include /node_modules/'
				);
				return defaultIsFileAsync(file, cb);
			});

			resolver.options.isFileAsync = resolver.wrapFsCheckAsync(spy);

			assert(
				(await resolver.async('react')).includes('/bower_components'),
				'Expected resolved path to include /bower_components/'
			);

			assert.strictEqual(spy.callCount, 8);
		});
	});
});
