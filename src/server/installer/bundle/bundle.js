import hash from 'object-hash';
import bigInt from 'big-integer';

import defineProperties from '../../../lib/helpers/defineProperties';
import once from '../../../lib/helpers/once';
import pick from '../../../lib/helpers/pick';
import { slugToAbsolutePath } from '../context';

export default class Bundle extends Set {
	constructor(id, { writer, options }) {
		super();

		Object.assign(this, {
			id,
			writer,
			options: {
				minSize: 5e4,
				maxSize: 10e4,
				...options
			}
		});

		defineProperties(this, {
			bytes: {
				writable: true
			},
			pending: new Set(),
			slugs: new Map()
		});
	}

	bytes = once(() => [...this].reduce((acc, resource) => acc + resource.size, 0));

	add(resource) {
		if (resource.loaded) {
			this.bytes.clear();
		}
		return resource.loaded ? super.add(resource) : this.pending.add(resource);
	}

	clear() {
		this.bytes.clear();
		this.pending.clear();
		return super.clear();
	}

	delete(resource) {
		this.bytes.clear();
		this.pending.delete(resource);
		return super.delete(resource);
	}

	calculateAssetIds() {
		if (!this.loaded()) {
			throw new Error(`Cannot calculate asset ids for bundle '${this.id}' before it is loaded`);
		}

		const { minSize, maxSize } = this.options;
		const { extension } = this.writer;
		const resourcesByAsset = new Map();
		const acc = new Set();
		let allocatedBytes = 0;
		let assetBytes = 0;

		const cutAsset = assetId => {
			resourcesByAsset.set(assetId, [...acc]);
			acc.forEach(resource => {
				this.slugs.set(resource, assetId);
			});
			acc.clear();
			assetBytes = 0;
		};

		for (const resource of [...this].sort((a, b) => bigInt(b.index).compare(bigInt(a.index)))) {
			acc.add(resource);
			if (this.id === resource.slug) {
				cutAsset(resource.getOutputSlug());
			} else {
				allocatedBytes += resource.size;
				assetBytes += resource.size;
				const remainingBytes = this.bytes() - allocatedBytes;
				if (remainingBytes === 0 || (assetBytes >= maxSize && remainingBytes >= minSize)) {
					const assetId = `${hash(
						[...acc]
							.sort((a, b) => a.pid - b.pid)
							.map(r => pick(r, ['moduleId', 'optionsChecksum', 'sourceChecksum'])),
						{ algorithm: 'md5' }
					)}${extension}`;
					cutAsset(assetId);
				}
			}
		}

		return resourcesByAsset;
	}

	getAssetId(resource) {
		if (!resource) {
			throw new Error('resource is required');
		}
		if (!this.slugs.has(resource)) {
			this.calculateAssetIds();
		}
		return this.slugs.get(resource);
	}

	getOutputPath(resource) {
		return slugToAbsolutePath(this.options.outputDir, this.getAssetId(resource));
	}

	loaded() {
		let result = true;
		for (const resource of this.pending) {
			if (resource.loaded) {
				this.add(resource);
				this.pending.delete(resource);
			} else if (!resource.isOrphaned()) {
				result = false;
				break;
			}
		}
		return result;
	}

	async write() {
		if (this.loaded()) {
			const resourcesByAsset = this.calculateAssetIds();
			await Promise.all(
				[...resourcesByAsset.entries()].map(([assetId, resources]) => {
					const path = slugToAbsolutePath(this.options.outputDir, assetId);
					const output =
						resources.length > 1 ? resources.map(r => r.output).join('\n') : resources[0].output;
					return this.writer.apply(path, output);
				})
			);
		}
	}
}
