import EventEmitter from 'events';

import { Logger, LoggerType } from '@remote-modules/logger';
import { noop } from '@remote-modules/helpers';

// import RequestContextFactory from './RequestContext';

export interface CompilerOptions {}

export default class Compiler extends EventEmitter implements CompilerOptions {
	logger: LoggerType;

	constructor(opts: CompilerOptions = {}) {
		super();
		this.logger = Logger();
		Object.assign(this, opts);
	}

	async run(force?: boolean): Promise<void> {
		noop(this);
	}
}
