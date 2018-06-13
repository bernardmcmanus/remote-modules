/* index.mjs */

import Path from 'path';

import { name } from './package.json';

export default `${name}/${Path.basename(__filename)}`;
