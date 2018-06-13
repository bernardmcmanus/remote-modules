/* index.js */

const assert = require('assert');
const Path = require('path');
const PACKAGE_NAME = 'remote-package';

// require.resolve
assert.strictEqual(require(require.resolve('react')), require('react'));

// require.cache (Variable Declaration)
const ReactFromCache = require.cache[require.resolve('react')].exports;
assert.strictEqual(ReactFromCache, require('react'));

// require.cache (Expression Statement)
assert.strictEqual(require.cache[require.resolve('react')].exports, require('react'));

// Babel polyfill / runtime
require('./babel-polyfill-and-runtime');

// Package names containing "."
require('lodash.memoize');

/**
 * External package / relative require / empty dependency
 * This module includes a relative dependency on an empty file
 * REQUEST fbjs/lib/Map
 * => REQUEST core-js/library/es6/map
 *    => REQUEST ../modules/es6.object.to-string
 *    => RESOLVE fbjs/node_modules/core-js/library/modules/es6.object.to-string.js (EMPTY)
 */
require('fbjs/lib/Map');
assert(require.cache[require.resolve('fbjs/node_modules/core-js/library/modules/es6.map')]);
assert(
	require.cache[require.resolve('fbjs/node_modules/core-js/library/modules/es6.object.to-string')]
);

/**
 * Incompatible versions
 * This module depends on the same file as the fbjs/lib/Map request above
 * (core-js/modules/es6.map) but will load a different version of core-js
 */
require('core-js/es6/map');
assert(require.cache[require.resolve('core-js/modules/es6.map')]);

if (!process.browser) {
	// nconf@0.7.2 attempts to call readdirSync in the module initializer which will
	// throw if it's not overriden with this dummy that returns an empty array
	const { readdirSync } = require('fs');
	require('fs').readdirSync = () => [];
	require('nconf');
	Object.assign(require('fs'), { readdirSync });
}

// react / jsx / relay
const { createElement } = require('react');
const { renderToString } = require('react-dom/server');
const html = renderToString(createElement(require('./component').default));
assert(/<div class="test"/.test(html));

// Relative / Resolved
const foo = require('./foo');
assert.strictEqual(foo, `${PACKAGE_NAME}/foo/index.js`);

// Relative / Direct
const notFoo = require('./foo/not-index');
assert.strictEqual(notFoo, `${PACKAGE_NAME}/foo/not-index.js`);

// JSON / no extension
const { name } = require('./package');
assert.strictEqual(name, PACKAGE_NAME);

// IIFE
const { Component } = (() => require('react'))();
assert.strictEqual(typeof Component, 'function');

exports.React = require('react');

exports.ReactHelmet = require('react-helmet');

exports.self = `${name}/${Path.basename(__filename)}`;

exports.hello = 'world!';
