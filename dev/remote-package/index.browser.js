/* index.browser.js */

const Path = require('path');

const { name } = require('./package.json');

exports.core = require('./tests/core');

exports.React = require('react');

exports.ReactHelmet = require('react-helmet');

exports.default = `${name}/${Path.basename(__filename)}`;
