import Url from 'url';

import stripBOM from 'strip-bom';

import memoize from '../../../../lib/helpers/memoize';
import logger from '../../../../lib/logger';

const warnMissingMethod = memoize(name => {
	logger.warn(`Parser should implement a '${name}' method`);
});

export default class Parser {
	constructor(methods) {
		['buildQuery', 'generate', 'getRequests', 'parse', 'runQuery'].forEach(key => {
			if (typeof methods[key] !== 'function') {
				throw new TypeError(`Parser must implement a '${key}' method`);
			}
		});

		['compress', 'formatError'].forEach(key => {
			if (typeof methods[key] !== 'function') {
				warnMissingMethod(key);
			}
		});

		this.methods = {
			compress: output => output,
			transform: () => this.ast,
			sourceMappingURL: content => `//# sourceMappingURL=${content}`,
			...methods
		};
	}

	requests = [];

	sourceMapJSON = null;

	get resourceURL() {
		return Url.resolve(this.sourceRoot, this.sourceFilename);
	}

	getSourceMappingURL(resource) {
		const { methods, sourceMapJSON, resourceURL } = this;
		const { sourceMaps } = resource.options;
		let result = '';
		if (sourceMapJSON && sourceMapJSON.version) {
			if (sourceMaps === 'inline') {
				const base64 = Buffer.from(JSON.stringify(sourceMapJSON)).toString('base64');
				result = `data:application/json;charset=utf-8;base64,${base64}`;
			} else if (sourceMaps !== 'hidden') {
				result = `${resourceURL}.map`;
			}
		}
		return result && `\n${methods.sourceMappingURL(result)}`;
	}

	init(slug, origin, sourceRoot) {
		this.filename = origin;
		this.sourceFilename = slug;
		this.sourceRoot = sourceRoot;
	}

	load(source) {
		const cleanSource = typeof source === 'string' ? stripBOM(source) : source;
		this.source = cleanSource;
		this.output = cleanSource;
		this.ast = this.parse(cleanSource);
	}

	parse(...args) {
		try {
			return this.methods.parse.apply(this, args);
		} catch (err) {
			if (err.name !== 'SyntaxError' || !this.methods.formatError) {
				throw err;
			}
			const formatted = this.methods.formatError.call(this, err);
			throw Object.assign(err, {
				frame: formatted,
				message: formatted,
				originalMessage: err.message
			});
		}
	}

	buildQuery(input) {
		return this.methods.buildQuery.call(this, input);
	}

	runQuery(...args) {
		return this.methods.runQuery.apply(this, args);
	}

	hasNode(...args) {
		return this.runQuery(...args).length > 0;
	}

	getRequests() {
		this.requests = this.methods.getRequests.call(this);
	}

	transform(...args) {
		this.ast = this.methods.transform.apply(this, args);
	}

	generate(...args) {
		this.output = this.methods.generate.apply(this, args);
	}

	compress(...args) {
		this.output = this.methods.compress.apply(this, args);
	}
}
