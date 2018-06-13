import once from '../../../../lib/helpers/once';
import NormalResource from './normal';

export default class NullResource extends NormalResource {
	getSourceChecksum = once(() => this.sourceChecksum);

	getOptionsChecksum = once(() => this.optionsChecksum);

	getOutputSlug() {
		return this.slug;
	}

	traverse() {
		if (this.error) {
			this.logger.warn(`Dropped null resource ${this.moduleId}`);
		} else {
			this.logger.debug(`Skipped null resource ${this.moduleId}`);
		}
		this.dirty = false;
		this.loaded = true;
	}

	// eslint-disable-next-line class-methods-use-this
	getDeepDependencySet() {
		return new Set();
	}
}
