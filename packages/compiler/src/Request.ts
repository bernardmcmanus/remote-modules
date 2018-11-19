import Path from 'path';
import { ParsedUrlQuery } from 'querystring';
import Url, { UrlObject } from 'url';

import { ObjectMap } from '@remote-modules/helpers/dist/types';

export default class Request implements UrlObject {
	readonly input: string;
	readonly base?: string;
	readonly pattern: string | null;
	readonly dynamic: boolean;
	readonly pathname: string = this.input;
	readonly query: ParsedUrlQuery = {};
	readonly attributes: ObjectMap<any> = {};

	constructor(input: string, base?: string) {
		if (!Path.isAbsolute(input) && !Path.isAbsolute(base || '.')) {
			throw new TypeError(`Invalid request: ${input}`);
		}

		Object.assign(this, Url.parse(input, true));

		this.input = input;
		this.base = base;
		this.pattern = null;
		this.dynamic = false;
	}
}
