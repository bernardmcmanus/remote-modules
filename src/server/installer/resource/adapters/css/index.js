import createParser from './parser';
import Writer from '../writer';
import DefaultAdapter from '../default';
import { createAdapter } from '../';
import escapeRegExp from '../../../../../lib/helpers/escapeRegExp';

export default (C, ctx) => {
	const defaultAdapter = DefaultAdapter(C, ctx);
	return createAdapter({
		outputType: 'css',
		parser: createParser(C),
		visitors: {
			Requests: {
				post: resource => {
					const requestMap = resource.getDependenciesByRequest();
					resource.requests.forEach(({ type, value }) => {
						const dependency = requestMap.get(value);
						switch (type) {
							case 'import': {
								const nodes = resource.adapter.parser.runQuery(`
									// ${type} [ @import =~ '${escapeRegExp(value)}' ]
								`);
								nodes.forEach(node => {
									if (dependency.isNormal()) {
										// Drop import statements for normal resources
										const { rules } = node.parent.stylesheet;
										const index = rules.indexOf(node);
										rules.splice(index, 1);
									}
								});
								break;
							}
							default: {
								const regexp = new RegExp(`(^|\\([\\'\\"]?)${escapeRegExp(value)}([\\'\\"]?\\)|$)`);
								const nodes = resource.adapter.parser.runQuery(`
									// ${type} [ @value =~ '${regexp.source}' ]
								`);
								if (dependency.isNormal()) {
									nodes.forEach(node => {
										// eslint-disable-next-line no-param-reassign
										node.value = node.value.replace(regexp, `$1${dependency.url}$2`);
									});
								} else if (dependency.isExternal()) {
									nodes.forEach(node => {
										// eslint-disable-next-line no-param-reassign
										node.value = node.value.replace(regexp, `$1${dependency.moduleId}$2`);
									});
								}
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
