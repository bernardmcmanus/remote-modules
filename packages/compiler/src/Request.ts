export default class Request {
	readonly request: string;
	readonly base: string;
	readonly origin: string;

	constructor(request: string, base: string, origin: string) {
		this.request = request;
		this.base = request;
		this.origin = origin;
	}
}
