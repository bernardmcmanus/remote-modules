export default class Registry {
	constructor(ttl) {
		if (typeof ttl !== 'number') {
			throw new Error('ttl is required');
		}
		this.ttl = ttl;
	}

	expires = null;

	cache = new Map();

	links = new Map();

	hasLink(key) {
		return this.links.has(key);
	}

	ln(alias, key) {
		this.links.set(alias, key);
	}

	lookup(key) {
		const { links } = this;
		return links.has(key) ? links.get(key) : key;
	}

	has(key) {
		return this.cache.has(this.lookup(key));
	}

	get(key) {
		return this.cache.get(this.lookup(key));
	}

	set(key, module) {
		const { cache } = this;
		const pid = this.lookup(key);
		if (!cache.has(pid)) {
			cache.set(pid, module);
		}
	}

	forEach(fn) {
		return this.cache.forEach(fn);
	}

	sweep() {
		if (!this.expires) {
			this.expires = Date.now() + this.ttl;
		}
		if (this.expires <= Date.now()) {
			this.clear();
		}
	}

	clear() {
		this.cache.clear();
		this.links.clear();
		this.expires = null;
	}
}
