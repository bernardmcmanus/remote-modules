import once from '../../../../lib/helpers/once';
import NormalResource from './normal';

export default class ExternalResource extends NormalResource {
	getSourceChecksum = once(() => this.sourceChecksum);

	getOptionsChecksum = once(() => this.optionsChecksum);

	getOutputSlug() {
		return this.slug;
	}

	traverse() {
		this.logger.debug(`Skipped external resource '${this.moduleId}'`);
		this.dirty = false;
		this.loaded = true;
	}

	// eslint-disable-next-line class-methods-use-this
	getDeepDependencySet() {
		return new Set();
	}
}
