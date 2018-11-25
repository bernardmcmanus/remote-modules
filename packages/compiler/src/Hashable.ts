import { defineProperties } from '@remote-modules/helpers';

export type Initializer<T> = {
	checksum?: string;
	value?: T;
};

export type Getters<T> = {
	checksum: () => Promise<Initializer<T>['checksum']>;
	value: () => Promise<Initializer<T>['value']>;
};

export default class Hashable<T> {
	static decode(value: any) {
		return typeof value === 'object' && value.type === 'Buffer' ? Buffer.from(value) : value;
	}

	checksum: Initializer<T>['checksum'];
	value: Initializer<T>['value'];
	getChecksum: Getters<T>['checksum'];
	getValue: Getters<T>['value'];

	constructor({ checksum, value }: Initializer<T> = {}, getters: Getters<T>) {
		this.checksum = checksum;
		this.value = Hashable.decode(value);
		this.getChecksum = getters.checksum;
		this.getValue = getters.value;

		defineProperties(this, {
			getChecksum: this.getChecksum,
			getValue: this.getValue
		});
	}

	async load() {
		let { checksum, value } = this;

		if (!value) {
			[checksum, value] = await Promise.all([this.getChecksum(), this.getValue()]);
		} else {
			const nextChecksum = await this.getChecksum();
			if (checksum !== nextChecksum) {
				checksum = nextChecksum;
				value = await this.getValue();
			}
		}

		Object.assign(this, { checksum, value });
	}
}
