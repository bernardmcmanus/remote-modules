export interface ResourceOptions {}

export default class Resource {
	readonly id: string;
	readonly options: ResourceOptions;

	constructor(id: string, opts: ResourceOptions) {
		this.id = id;
		this.options = opts;
	}
}
