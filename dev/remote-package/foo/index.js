/* foo/index.js */

const Path = require('path');

const { name } = require('../package.json');

require('./foo');

module.exports = `${name}/${Path.basename(__dirname)}/${Path.basename(__filename)}`;
