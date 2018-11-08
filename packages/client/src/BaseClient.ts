import { defineProperties } from '@remote-modules/helpers';

export default class BaseClient {
	static parseRequest(request: string = '') {
		const [, _namespace, _scope, namespace = _namespace, scope = _scope, moduleId] = request.match(
			/^(?:(?:<([^@]+)>)|(?:<(@[^>]+)>)|(?:<([^@]+)\/(@[^>]+)>))?\/?(.*)$/
		) as any[];
		if (/<|>/.test(request) && moduleId === request) {
			throw new Error(`Malformed request '${moduleId}'`);
		}
		return { namespace, scope, moduleId };
	}

	constructor() {
		defineProperties(this, {
			lastActiveLoader: {
				value: undefined,
				writable: true
			}
		});
	}
}
