import { isDataURL } from '../../../../lib/helpers';
import once from '../../../../lib/helpers/once';
import NormalResource from './normal';

function truncateDataURL(value) {
	return isDataURL(value) && value.length >= 100 ? `${value.slice(0, 80)}\u2026` : value;
}

export default class ExternalResource extends NormalResource {
	getSourceChecksum = once(() => this.sourceChecksum);

	getOptionsChecksum = once(() => this.optionsChecksum);

	getOutputSlug() {
		return this.slug;
	}

	traverse() {
		this.logger.debug(`Skipped external resource '${truncateDataURL(this.moduleId)}'`);
		this.dirty = false;
		this.loaded = true;
	}

	// eslint-disable-next-line class-methods-use-this
	getDeepDependencySet() {
		return new Set();
	}
}
