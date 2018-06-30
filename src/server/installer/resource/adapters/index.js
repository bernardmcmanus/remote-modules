import get from '../../../../lib/helpers/get';
import noop from '../../../../lib/helpers/noop';
import RawAdapter from './raw';
import Reader from './reader';
import Writer from './writer';

function getDefaultVisitors(visitors = {}) {
	const visitorKeys = ['Read', 'Parse', 'Requests', 'Generate', 'Write', 'Complete'];
	const getSplitVisitor = (value = {}) => ({
		pre: (typeof value === 'function' ? value : value.pre) || noop,
		post: value.post || noop
	});
	return visitorKeys.reduce((acc, key) => {
		acc[key] = getSplitVisitor(visitors[key]);
		return acc;
	}, {});
}

export function getAdapter(C, ctx) {
	const { adapter = RawAdapter } = C.adapters.find(({ test }) => test(ctx)) || {};
	return adapter(C, ctx);
}

export function createAdapter({
	reader = new Reader(),
	writer = new Writer(),
	parser,
	visitors,
	...other
}) {
	return {
		...other,
		parser,
		reader,
		writer,
		visitors: getDefaultVisitors(visitors),
		runVisitor(resource, path) {
			return get(this, ['visitors', ...path])(resource);
		}
	};
}
