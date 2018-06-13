/* foo/not-index.js */

const Path = require('path');

const { name } = require('../package.json');

module.exports = `${name}/${Path.basename(__dirname)}/${Path.basename(__filename)}`;
