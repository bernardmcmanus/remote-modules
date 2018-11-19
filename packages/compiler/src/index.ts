import Path from 'path';

import Emittery from 'emittery';
import { Logger, LoggerType } from '@remote-modules/logger';
import { defineProperties, memoize } from '@remote-modules/helpers';

import createFactory, { Factory, FactoryOptions } from './Factory';
import Request from './Request';
import RequestContext from './RequestContext';
import Resource from './Resource';

export interface CompilerOptions {
	root?: string;
	entry?: string;
	extensions?: FactoryOptions['extensions'];
	mainFields?: FactoryOptions['mainFields'];
	moduleDirs?: FactoryOptions['moduleDirs'];
}

export type CompilerEventData = Request | RequestContext | Resource;

export default class Compiler extends Emittery implements CompilerOptions {
	root: string = '.';
	entry: string = '.';
	extensions: CompilerOptions['extensions'];
	mainFields: CompilerOptions['mainFields'];
	moduleDirs: CompilerOptions['moduleDirs'];
	logger: LoggerType;
	factory: Factory;
	rootDir: string;

	constructor(opts: CompilerOptions = {}) {
		super();

		Object.assign(this, opts);
		this.logger = Logger();
		this.rootDir = Path.resolve(this.root);
		this.factory = createFactory({
			rootDir: this.rootDir,
			extensions: this.extensions,
			mainFields: this.mainFields,
			moduleDirs: this.moduleDirs
		});

		defineProperties(this, {
			logger: this.logger
		});
	}

	emitMemo = memoize(
		(type: string, data: CompilerEventData) => this.emit(type, data),
		(type: string, data: CompilerEventData) => data,
		new WeakMap()
	);

	async run(force?: boolean) {
		if (force) {
			this.factory.clear();
		}

		const ctx = await this.factory(this.entry, undefined, {
			request: request => this.emitMemo('request', request),
			context: context => this.emitMemo('context', context),
			resource: resource => this.emitMemo('resource', resource)
		});

		return ctx;
	}
}
