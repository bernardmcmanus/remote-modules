import identity from '../../lib/helpers/identity';

export const createContext = identity;

export class Script {
	constructor(content, options) {
		Object.assign(this, { content }, options);
	}
	runInContext() {
		return this.content;
	}
	runInThisContext() {
		return this.content;
	}
}
