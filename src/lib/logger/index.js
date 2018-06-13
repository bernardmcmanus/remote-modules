import Bunyan from 'bunyan';

import FormattedStream from './formatted-stream';

import pkg from '../../../package.json';

export class Logger extends Bunyan {
	constructor(options) {
		super({
			name: pkg.name,
			level: process.env.LOG_LVL,
			streams: [
				{
					type: 'raw',
					stream: new FormattedStream()
				}
			],
			...options
		});
	}

	child(options) {
		return new this.constructor({
			level: this.level(),
			streams: [...this.streams],
			...options
		});
	}

	profile() {
		const start = process.hrtime();
		return label => {
			const [s, ns] = process.hrtime(start);
			const ms = s * 1e3 + ns * 1e-6;
			const message = label.message || label;
			const level = label.level || 'info';
			this[level](`${message} duration=${ms.toFixed(3)}ms`);
		};
	}
}

export default new Logger();
