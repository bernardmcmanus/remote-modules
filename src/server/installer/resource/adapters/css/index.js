import createParser from './parser';
import Writer from '../writer';
import DefaultAdapter from '../default';
import { createAdapter } from '../';
import escapeRegExp from '../../../../../lib/helpers/escapeRegExp';
import { parseAttributes } from '../../../../../lib/request-attributes';

export default (C, ctx) => {
	const defaultAdapter = DefaultAdapter(C, ctx);
	return createAdapter({
		outputType: 'css',
		parser: createParser(C),
		visitors: {
			Requests: {
				post: resource => {
					resource.requests.forEach(request => {
						const requestCtx = resource.contextFactory(request, resource.getResolverPaths());
						const { attributes, type, value } = request;
						switch (type) {
							case 'import': {
								const nodes = resource.adapter.parser.runQuery(`
									// ${type} [ @import =~ '${escapeRegExp(value)}' ]
								`);
								nodes.forEach(node => {
									if (requestCtx.isNormal()) {
										// Drop import statements for normal resources
										const { rules } = node.parent.stylesheet;
										const index = rules.indexOf(node);
										rules.splice(index, 1);
									}
								});
								break;
							}
							default: {
								const regexp = new RegExp(
									`(^|\\([\\'\\"]?)(?:<.+>)?${escapeRegExp(value)}([\\'\\"]?\\)|$)`
								);
								const nodes = resource.adapter.parser.runQuery(`
									// ${type} [ @value =~ '${regexp.source}' ]
								`);
								nodes.forEach(node => {
									const { list } = parseAttributes(node.value);
									if (attributes === list || (attributes && attributes.includes(list))) {
										// eslint-disable-next-line no-param-reassign
										node.value = node.value.replace(regexp, `$1${requestCtx.url}$2`);
									}
								});
								break;
							}
						}
					});
				}
			},
			Complete: {
				post: resource => defaultAdapter.runVisitor(resource, ['Complete', 'post'])
			}
		},
		writer: new Writer({ extension: '.css' })
	});
};
