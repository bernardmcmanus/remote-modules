import defineProperties from '../../../lib/helpers/defineProperties';
import memoize from '../../../lib/helpers/memoize';
import Union from './union';

export default function UnionFactory() {
	const createUnion = memoize((id, options) => new Union(id, options));

	function factory(id, options) {
		return createUnion(id, options);
	}

	return defineProperties(factory, {
		name: 'UnionFactory',
		cache: createUnion.cache
	});
}
