import defineProperties from '../../../lib/helpers/defineProperties';
import memoize from '../../../lib/helpers/memoize';
import Bundle from './bundle';

export default function BundleFactory() {
	const createBundle = memoize((id, options) => new Bundle(id, options));

	function factory(id, options) {
		return createBundle(id, options);
	}

	return defineProperties(factory, {
		name: 'BundleFactory',
		cache: createBundle.cache
	});
}
