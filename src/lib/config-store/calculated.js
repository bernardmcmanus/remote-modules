import Url from 'url';

import merge from 'deepmerge';

import { isPlainObject, pickDefined } from '../helpers';
import getDefaults from './defaults';

const { BABEL_ENV } = process.env;

export default opts => {
	const babel = {
		envName: BABEL_ENV || opts.env,
		...pickDefined(opts.babel)
	};

	const define = {
		'process.env.NODE_ENV':
			opts.define['process.env.NODE_ENV'] || opts.define['process.env.BUILD_ENV'] || opts.env,
		...pickDefined(opts.define)
	};

	const optimize = isPlainObject(opts.optimize)
		? {
				constantFolding: opts.env === 'production',
				...pickDefined(opts.optimize)
		  }
		: opts.optimize;

	const server = {
		publicPath: Url.parse(opts.server.uri).pathname,
		redirects: opts.env === 'development',
		...pickDefined(opts.server)
	};

	let uglify =
		opts.uglify !== undefined
			? opts.uglify
			: opts.preset === 'browser' && opts.env === 'production';

	if (uglify === true) {
		uglify = getDefaults('uglify');
	} else if (isPlainObject(uglify)) {
		uglify = merge(getDefaults('uglify'), uglify);
	}

	/**
	 * IMPORTANT: uglify.compress.expression MUST be true or the entire
	 * module will be treated as dead code and removed.
	 */
	if (uglify) {
		if (uglify.compress === true) {
			uglify.compress = getDefaults('uglify').compress;
		}
		if (isPlainObject(uglify.compress)) {
			uglify.compress.expression = true;
		}
	}

	return { babel, define, optimize, server, uglify };
};
