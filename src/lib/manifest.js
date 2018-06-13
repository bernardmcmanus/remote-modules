export default class Manifest {
	static internals = Symbol('internals');

	static load(internals) {
		return new Manifest(internals.dependencies, internals);
	}

	static derive(parent, meta) {
		const internals = parent.internals();
		return new Manifest(internals.dependencies, { ...internals, meta });
	}

	constructor(dependencies, internals = {}) {
		Object.defineProperty(this, Manifest.internals, {
			value: Object.freeze({ ...internals, dependencies }),
			writable: false,
			enumerable: false
		});

		const lookupTable = new Map();
		const meta = this.meta();

		dependencies.forEach(value => {
			lookupTable.set(value.pid, value);
			lookupTable.set(value.moduleId, value);
		});

		lookupTable.set(meta.pid, meta);
		lookupTable.set(meta.moduleId, meta);

		this.lookupTable = lookupTable;
		this.exclusions = new Set(internals.exclusions);
	}

	lookup(key) {
		return this.lookupTable.get(key);
	}

	exists(key) {
		return this.lookupTable.has(key);
	}

	excluded(pid) {
		return this.exclusions.has(pid);
	}

	getModuleId(key) {
		return (this.exists(key) && this.lookup(key).moduleId) || undefined;
	}

	getPid(key) {
		return (this.exists(key) && this.lookup(key).pid) || undefined;
	}

	getType(key) {
		return (this.exists(key) && this.lookup(key).type) || undefined;
	}

	getAssetId(key) {
		return (this.exists(key) && this.lookup(key).assetId) || undefined;
	}

	internals(key) {
		const internals = this[Manifest.internals];
		return key ? internals[key] : internals;
	}

	meta(key) {
		const meta = this.internals('meta');
		return key ? meta[key] : meta;
	}

	list() {
		return this.internals('dependencies').map(({ moduleId }) => moduleId);
	}

	package(key) {
		return this.internals('packages')[key];
	}

	toJSON() {
		return this.internals();
	}
}
