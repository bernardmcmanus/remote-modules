import EventEmitter from 'events';

import { Logger, LoggerType } from '@remote-modules/logger';
import { noop } from '@remote-modules/helpers';

export default class Compiler extends EventEmitter {
	logger: LoggerType;

	constructor() {
		super();
		this.logger = Logger();
	}

	async run(force?: boolean): Promise<void> {
		noop(this);
	}
}
