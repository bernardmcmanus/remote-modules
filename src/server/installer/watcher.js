import Path from 'path';

import { FSWatcher } from 'chokidar';

import defineProperties from '../../lib/helpers/defineProperties';
import identity from '../../lib/helpers/identity';

function aggregate(fn, combiner = identity, delay) {
	const calls = new Map();
	let timerId;
	return (...args) => {
		clearTimeout(timerId);
		timerId = setTimeout(() => {
			fn([...calls.values()]);
			calls.clear();
		}, delay);
		calls.set(combiner(...args), args);
	};
}

export default class Watcher extends FSWatcher {
	constructor(opts) {
		super({
			ignoreInitial: true,
			persistent: true,
			...opts
		});

		defineProperties(this, {
			ready: {
				value: false,
				writable: true
			},
			size: {
				get: () => [...this.scopes.values()].reduce((acc, { size }) => acc + size, 0)
			}
		});

		this.reset();

		this.once('ready', () => {
			this.ready = true;
		});
	}

	scopes = new Map();

	getPaths() {
		const paths = new Set();
		for (const [, scopePaths] of this.scopes) {
			for (const path of scopePaths) {
				paths.add(path);
			}
		}
		return paths;
	}

	getWatched() {
		return new Set(
			Object.entries(super.getWatched()).reduce((acc, [base, files]) => {
				files.forEach(file => {
					acc.push(Path.join(base, file));
				});
				return acc;
			}, [])
		);
	}

	addUnwatched() {
		const watched = this.getWatched();
		this.add([...this.getPaths()].filter(path => !watched.has(path)));
	}

	start() {
		return new Promise(resolve => {
			this.addUnwatched();
			if (this.ready || this.size === 0) {
				resolve(this);
			} else {
				this.once('ready', () => resolve(this));
			}
		});
	}

	register(resource) {
		const { scopeKey } = resource.options;
		if (!this.scopes.has(scopeKey)) {
			this.scopes.set(scopeKey, new Set());
		}
		const scopePaths = this.scopes.get(scopeKey);
		[resource, ...resource.getDeepDependencySet(r => r.isNormal())].forEach(r => {
			scopePaths.add(r.origin);
		});
	}

	subscribe(mainResource, fn) {
		const wrappedFn = async events => {
			const pickedEvents = events.reduce((acc, [type, path]) => {
				// unwatch deleted resources
				if (type === 'unlink') {
					this.unwatch(path);
				}
				const resource = mainResource.resourceFactory(path);
				if (resource && (resource.sameAs(mainResource) || resource.dependencyOf(mainResource))) {
					acc.push([type, resource]);
				}
				return acc;
			}, []);

			if (pickedEvents.length) {
				try {
					await fn(pickedEvents);
					this.register(mainResource);
					this.addUnwatched();
					this.emit('update', mainResource);
				} catch (err) {
					if (this.listenerCount('error')) {
						this.emit('error', err);
					} else {
						throw err;
					}
				}
			}
		};

		this.register(mainResource);
		this.on('all:aggregated', wrappedFn);

		return () => this.removeListener('all:aggregated', wrappedFn);
	}

	close() {
		super.close();
		this.scopes.clear();
		this.removeAllListeners();
		return this;
	}

	reset() {
		this.close();
		this.subscribeAggregator = aggregate(
			events => this.emit('all:aggregated', events),
			(type, path) => `${type}:${path}`,
			this.options.interval
		);
		this.on('all', this.subscribeAggregator);
	}
}
