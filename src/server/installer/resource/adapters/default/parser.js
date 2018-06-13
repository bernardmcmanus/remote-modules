import * as babylon from '@babel/parser';
import * as babel from '@babel/core';
import generate from '@babel/generator';
import { codeFrameColumns } from '@babel/code-frame';
import ASTQ from 'astq';
import UglifyJS from 'uglify-es';
import cloneDeep from 'clone-deep';
import merge from 'deepmerge';
import babelMerge from 'babel-merge/src';

import Parser from '../parser';
import memoize from '../../../../../lib/helpers/memoize';
import pick from '../../../../../lib/helpers/pick';
import { pickDefined } from '../../../../../lib/helpers';

const astq = new ASTQ();

const buildQuery = memoize(input => {
	const node = typeof input === 'string' ? babylon.parseExpression(input) : input;
	let query = `${node.type}`;
	switch (node.type) {
		case 'Identifier':
			query = `${query} [ @name == '${node.name}' ]`;
			break;
		case 'MemberExpression':
			query = `${query} [
				/:object ${buildQuery(node.object)} && /:property ${buildQuery(node.property)}
			]`;
			break;
		case 'StringLiteral':
			query = `${query} [ @value == '${node.value}' ]`;
			break;
		default:
			// noop
			break;
	}
	return query;
});

function getBabelOpts(parser, resource, options) {
	return babelMerge.all([
		{
			/**
			 * IMPORTANT: babelrc is false so babel doesn't
			 * attempt a babrlrc lookup on every transform
			 */
			babelrc: false,
			filenameRelative: parser.sourceFilename,
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
					).map(node => ({ value: node.source.value })),
					...this.runQuery(
						`
						// CallExpression [
							/:callee ${buildQuery('require')}
						]
					`
					).map(node => ({ value: node.arguments[0].value })),
					...this.runQuery(
						`
						// CallExpression [(
							/ ${buildQuery('System.import')}
						) || (
							/:callee Import
						)]
					`
					).map(node => ({ value: node.arguments[0].value, async: true }))
				]
					.reduce((acc, request) => {
						if (request.value && !acc.has(request.value)) {
							acc.set(request.value, request);
						}
						return acc;
					}, new Map())
					.values()
			);
		},
		transform(resource, options) {
			const opts = getBabelOpts(this, resource, { ...options, ast: true, code: false });
			return babel.transformFromAst(this.ast, null, opts).ast;
		},
		generate(resource, options) {
			const opts = getBabelOpts(this, resource, { ...options, ast: false, code: true });
			return generate(this.ast, opts).code;
		},
		compress(resource, options) {
			// FIXME: Uglify directly from AST before generate?
			// https://github.com/mishoo/UglifyJS2/tree/v3.3.12#using-native-uglify-ast-with-minify
			const opts = merge.all([resource.options.uglify, cloneDeep(options)].filter(Boolean));
			const { code, error } = UglifyJS.minify(this.output, opts);
			if (error) {
				throw error;
			}
			return code;
		}
	});
