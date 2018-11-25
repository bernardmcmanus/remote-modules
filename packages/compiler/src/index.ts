import Path from 'path';

import Emittery from 'emittery';
import { Logger, LoggerType } from '@remote-modules/logger';
import { defineProperties, memoize } from '@remote-modules/helpers';

import createFactory, { Factory, FactoryOptions } from './Factory';
import Request from './Request';
import RequestContext from './RequestContext';
import Resource from './Resource';

export interface CompilerOptions {
	scope: symbol;
	root?: string;
	entry?: string;
	extensions?: FactoryOptions['extensions'];
	mainFields?: FactoryOptions['mainFields'];
	moduleDirs?: FactoryOptions['moduleDirs'];
}

export type CompilerEventData = Request | RequestContext | Resource;

export default class Compiler extends Emittery {
	scope: string;
	root: string = '.';
	entry: string = '.';
	logger: LoggerType;
	factory: Factory;
	rootDir: string;

	constructor({ extensions, mainFields, moduleDirs, scope, ...other }: CompilerOptions) {
		super();

		Object.assign(this, other);

		this.scope = <string>Symbol.keyFor(scope);
		this.logger = Logger({ label: this.scope });
		this.rootDir = Path.resolve(this.root);
		this.factory = createFactory({
			extensions,
			mainFields,
			moduleDirs,
			rootDir: this.rootDir,
			scope: this.scope
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
		const { factory } = this;

		if (force) {
			factory.clear();
		} else {
			await factory.load();
		}

		const ctx = await factory(this.entry, undefined, {
			request: request => this.emitMemo('request', request),
			context: context => this.emitMemo('context', context),
			resource: resource => this.emitMemo('resource', resource)
		});

		await factory.commit();

		return ctx;
	}
}
