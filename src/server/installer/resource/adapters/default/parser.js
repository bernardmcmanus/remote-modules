import Path from 'path';

import * as babylon from '@babel/parser';
import * as babel from '@babel/core';
import { codeFrameColumns } from '@babel/code-frame';
import ASTQ from 'astq';
import glob from 'glob';
import UglifyJS from 'uglify-es';
import cloneDeep from 'clone-deep';
import merge from 'deepmerge';
import babelMerge from 'babel-merge';

import Parser from '../parser';
import generateResourceRequest from '../../../generators/resource-request';
import memoize from '../../../../../lib/helpers/memoize';
import pick from '../../../../../lib/helpers/pick';
import { isPrimitive, pickDefined } from '../../../../../lib/helpers';

const astq = new ASTQ();

const excludeFromQuery = new Set(['start', 'end', 'computed']);

const buildQuery = memoize(input => {
	let brackets;
	const node = typeof input === 'string' ? babylon.parseExpression(input) : input;
	return `${Object.entries(node).reduce((acc, [key, value]) => {
		switch (true) {
			case excludeFromQuery.has(key):
				// noop
				break;
			case key === 'type':
				// eslint-disable-next-line no-param-reassign
				acc = `${acc}${value}`;
				break;
			case Boolean(value && value.type):
				// nodes
				// eslint-disable-next-line no-param-reassign
				acc = `${acc} ${brackets ? '&&' : '['} /:${key} ${buildQuery(value)}`;
				brackets = true;
				break;
			case isPrimitive(value):
				// primitive attributes
				// eslint-disable-next-line no-param-reassign
				acc = `${acc} ${brackets ? '&&' : '['} @${key} == ${
					typeof value === 'string' ? `'${value}'` : value
				}`;
				brackets = true;
				break;
			default:
				// noop
				break;
		}
		return acc;
	}, '')}${brackets ? ' ]' : ''}`;
});

function getBabelOpts(parser, resource, options) {
	const sourceMaps = Boolean(resource.options.sourceMaps);
	const retainLines = sourceMaps && resource.options.preset === 'node';
	return babelMerge.all([
		{
			/**
			 * IMPORTANT: babelrc is false so babel doesn't
			 * attempt a babrlrc lookup on every transform
			 */
			babelrc: false,
			filenameRelative: parser.sourceFilename,
			retainLines,
			sourceMaps,
			shouldPrintComment: content => parser.requests.some(({ value }) => value === content),
			...pickDefined(pick(parser, ['filename', 'shouldPrintComment', 'sourceRoot']))
		},
		resource.isInstalledPackage() ? null : resource.getBabelOptions(),
		options
	]);
}

export default C =>
	new Parser({
		formatError(err) {
			const location = { start: err.loc, end: err.loc, filename: this.sourceFilename };
			const options = { message: err.message, highlightCode: true };
			const frame = codeFrameColumns(this.source, location, options);
			return `${this.sourceFilename}:\n\n${frame}\n`;
		},
		parse(source, options) {
			return babylon.parse(source, {
				...C.babylon,
				sourceFilename: this.sourceFilename,
				...options
			});
		},
		buildQuery(input) {
			return buildQuery(input);
		},
		runQuery(query, ast = this.ast) {
			return astq.query(ast, query);
		},
		getRequests() {
			return Array.from(
				[
					...this.runQuery(
						`
						// ImportDeclaration
					`
					),
					...this.runQuery(
						`
						// CallExpression [
							/:callee ${buildQuery('require')}
						]
					`
					),
					...this.runQuery(
						`
						// CallExpression [(
							/ ${buildQuery('System.import')}
						) || (
							/:callee Import
						)]
					`
					)
				]
					.reduce((acc, node) => {
						const request = generateResourceRequest(node, buildQuery);
						if (request.value && !acc.has(request.getKey())) {
							const key = request.getKey();
							acc.set(key, { ...request, key });
						} else if (request.pattern) {
							const cwd = Path.dirname(this.filename);
							glob.sync(request.pattern, { cwd }).forEach(value => {
								const key = request.getKey(value);
								acc.set(key, { ...request, key, value });
							});
						}
						return acc;
					}, new Map())
					.values()
			).filter(request => request.value);
		},
		transform(resource, options) {
			const opts = getBabelOpts(this, resource, { ...options, ast: true, code: false });
			const { ast } = babel.transformFromAstSync(this.ast, null, opts);
			return ast;
		},
		generate(resource, options) {
			const opts = getBabelOpts(this, resource, options);
			const { code, map } = babel.transformFromAstSync(this.ast, this.source, opts);
			this.sourceMapJSON = { ...map, sourcesContent: [this.source] };
			return `${code}${this.getSourceMappingURL(resource)}`;
		},
		compress(resource, options) {
			// FIXME: Uglify directly from AST before generate?
			// https://github.com/mishoo/UglifyJS2/tree/v3.3.12#using-native-uglify-ast-with-minify
			const opts = merge.all([resource.options.uglify, cloneDeep(options)].filter(Boolean));
			const { code, error, map = '{}' } = UglifyJS.minify(
				{ [this.resourceURL]: this.output },
				opts
			);
			if (error) {
				throw error;
			}
			this.sourceMapJSON = { ...JSON.parse(map), sourcesContent: [this.source] };
			return `${code}${this.getSourceMappingURL(resource)}`;
		}
	});
