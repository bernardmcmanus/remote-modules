import * as css from 'css';
import ASTQ from 'astq';

import Parser from '../parser';
import get from '../../../../../lib/helpers/get';
import {
	formatAttributes,
	parseAttributes,
	stripAttributes
} from '../../../../../lib/request-attributes';

const astq = new ASTQ();

astq.adapter(
	{
		getNodeType: node => node.type,
		getParentNode: node => node.parent,
		getChildNodes: (node, type) => {
			let children;
			if (type === '*') {
				children = []
					.concat(get(node, ['stylesheet', 'rules']), node.rules, node.declarations, node.keyframes)
					.filter(Boolean);
			} else if (node[type]) {
				children = [].concat(node[type]);
			} else {
				throw new Error(`No such axis '${type}' for walking child nodes`);
			}
			return children;
		},
		getNodeAttrNames: node => {
			const names = [];
			for (const [key, value] of Object.entries(node)) {
				if (key !== 'type' && key !== 'position' && (value === null || typeof value !== 'object')) {
					names.push(key);
				}
			}
			return names;
		},
		getNodeAttrValue: (node, key) => node[key]
	},
	true
);

export default () =>
	new Parser({
		parse(source, options) {
			return css.parse(source, {
				source: this.sourceFilename,
				...options
			});
		},
		buildQuery() {
			return '';
		},
		runQuery(query, ast = this.ast) {
			return astq.query(ast, query);
		},
		getRequests() {
			return Array.from(
				[
					...this.runQuery('// import').map(node => {
						const [, value] = /^(?:url\()?["']?([^\s"')]+)["']?\)?$/i.exec(node.import);
						return { type: node.type, value };
					}),
					...this.runQuery('// declaration').reduce((acc, node) => {
						const urlRegExp = /url\(["']?([^\s"']+)["']?\)/gi;
						let value;
						// eslint-disable-next-line no-cond-assign, no-sequences
						while ((([, value] = urlRegExp.exec(node.value) || []), value)) {
							acc.push({ type: node.type, value });
						}
						return acc;
					}, [])
				]
					.reduce((acc, request) => {
						if (request.value) {
							const { attributes } = parseAttributes(request.value);
							const value = stripAttributes(request.value.replace(/["']/g, ''));
							const attributesString = formatAttributes(attributes);
							const key = [attributesString, value].join('');
							if (value && !acc.has(key)) {
								acc.set(key, {
									...request,
									...attributes,
									attributes: attributesString,
									value,
									key
								});
							}
						}
						return acc;
					}, new Map())
					.values()
			);
		},
		generate(resource, options) {
			const result = css.stringify(this.ast, {
				inputSourcemaps: true,
				sourcemap: Boolean(resource.options.sourceMaps && !this.sourceMapJSON),
				...options
			});
			if (result.map) {
				this.sourceMapJSON = {
					...result.map,
					sourceRoot: this.sourceRoot
				};
			}
			return `${result.code || result}${this.getSourceMappingURL(resource)}`;
		},
		sourceMappingURL: content => `/*# sourceMappingURL=${content} */`
	});
