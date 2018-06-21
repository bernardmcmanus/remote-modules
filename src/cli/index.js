#!/usr/bin/env node

import { spawn } from 'child_process';

import yargs from 'yargs';

import Server from '../server';
import Installer from '../server/installer';
import ConfigStore from '../lib/config-store';
import logger from '../lib/logger';
import pick from '../lib/helpers/pick';
import { pickDefined } from '../lib/helpers';
import { normalizeArrayOption, toPrimitive } from './helpers';

const C = new ConfigStore();

function commonOptionsBuilder(program) {
	return program
		.positional('entry', {
			describe: 'Install entrypoint',
			type: 'string',
			defaultDescription: C.defaults.entry
		})
		.option('config', {
			alias: 'c',
			describe: 'Path to a .modulerc file',
			type: 'string',
			defaultDescription: C.defaults.config
		})
		.option('define', {
			alias: 'd',
			describe: 'Variable definitions to be evaluated at install',
			type: 'array',
			default: []
		})
		.option('ext', {
			alias: 'e',
			describe: 'Extensions to resolve',
			type: 'array',
			defaultDescription: C.defaults.extensions
		})
		.option('force', {
			alias: 'f',
			describe: 'Skip cache and install directly from source',
			type: 'boolean',
			default: false
		})
		.option('include', {
			alias: 'i',
			describe: 'Include pattern',
			type: 'array',
			defaultDescription: C.defaults.include
		})
		.option('mainfields', {
			describe: 'Package entrypoints',
			type: 'array',
			defaultDescription: C.defaults.mainFields
		})
		.option('moduledirs', {
			describe: 'Module directories',
			type: 'array',
			defaultDescription: C.defaults.moduleDirs
		})
		.option('output', {
			alias: 'o',
			describe: 'Output directory',
			type: 'string',
			defaultDescription: C.defaults.output
		})
		.option('preset', {
			alias: 'p',
			describe: 'Load target presets',
			type: 'string',
			defaultDescription: C.defaults.preset
		})
		.option('root', {
			alias: 'r',
			describe: 'Project root',
			type: 'string',
			defaultDescription: C.defaults.root
		})
		.option('scope', {
			alias: 's',
			describe: 'Config scope for multiple build variants',
			type: 'string',
			default: undefined
		})
		.option('strict', {
			describe: 'Fail on missing dependency',
			type: 'boolean',
			default: undefined,
			defaultDescription: C.defaults.strict
		})
		.option('target', {
			describe: 'Output target',
			type: 'string',
			defaultDescription: C.defaults.outputTarget
		})
		.option('uglify', {
			describe: 'Uglify output',
			type: 'boolean',
			default: undefined,
			defaultDescription: C.defaults.uglify
		})
		.option('verbose', {
			alias: 'v',
			describe: 'Verbose logging',
			type: 'boolean',
			default: true
		});
}

function commonOptionsParser(argv, extras = []) {
	const {
		define: _define,
		include,
		config,
		entry,
		ext,
		mainfields,
		moduledirs,
		output,
		preset,
		root,
		scope,
		strict,
		target: outputTarget,
		uglify,
		force,
		verbose,
		...other
	} = argv;

	if (verbose) {
		logger.level('trace');
	}

	const define = normalizeArrayOption(_define).reduce((acc, pair) => {
		const [key, value] = pair.split('=');
		return { ...acc, [key]: value };
	}, {});
	const extensions = normalizeArrayOption(ext);
	const mainFields = normalizeArrayOption(mainfields);
	const moduleDirs = normalizeArrayOption(moduledirs);

	return pickDefined(
		toPrimitive({
			...pick(other, extras),
			config,
			entry,
			define,
			extensions,
			mainFields,
			moduleDirs,
			output,
			outputTarget,
			preset,
			root,
			scope,
			strict,
			uglify,
			force,
			include
		})
	);
}

yargs
	.usage('Usage: $0 <command> [options]')
	.command({
		command: 'install [entry] [options]',
		desc: 'Prep the code you want to serve remotely',
		builder: program =>
			commonOptionsBuilder(program).option('workers', {
				describe: 'Run multi-scope installs on worker processes',
				type: 'boolean',
				default: true
			}),
		handler: async argv => {
			const { force, scope, workers, ...options } = commonOptionsParser(argv, ['workers']);
			try {
				C.init(options);
				if (scope || C.scopes().length === 1) {
					const install = new Installer(C.use(scope || C.scopes()[0]));
					await install(force);
				} else if (workers) {
					const [, ...args] = [...process.argv];
					if (!/\/dist\//.test(__filename)) {
						args.unshift('-r', '@babel/register');
					}
					await Promise.all(
						C.scopes().map(symbol => {
							const scopeKey = ConfigStore.symbolOf(symbol);
							const child = spawn('node', [...args, '-s', scopeKey], { stdio: 'inherit' });
							process.once('exit', code => child.kill(code));
							return new Promise((resolve, reject) => {
								child.once('exit', code => {
									if (code) {
										reject(
											new Error(`Worker process for scope '${scopeKey}' exited with code ${code}`)
										);
									} else {
										resolve();
									}
								});
							});
						})
					);
				} else {
					await Promise.all(
						C.scopes().map(symbol => {
							const install = new Installer(C.use(symbol));
							return install(force);
						})
					);
				}
			} catch (err) {
				logger.error(err);
				// eslint-disable-next-line no-process-exit
				process.exit(1);
			}
		}
	})
	.command({
		command: 'start [entry] [options]',
		desc: 'Start the server',
		builder: program =>
			commonOptionsBuilder(program)
				.option('production', {
					describe: 'Start in production mode',
					type: 'boolean',
					default: undefined,
					defaultDescription: false
				})
				.option('watch', {
					describe: 'Watch for changes',
					type: 'boolean',
					default: undefined,
					defaultDescription: false
				}),
		handler: async argv => {
			const { force, scope, production, ...options } = commonOptionsParser(argv, [
				'production',
				'watch'
			]);
			try {
				C.init(options);
				const server = new Server(scope ? C.use(scope) : C);
				// FIXME: this is a quick and dirty check to support production builds
				if (!production) {
					await server.install(force);
				}
				await server.listen();
			} catch (err) {
				logger.error(err);
				// eslint-disable-next-line no-process-exit
				process.exit(1);
			}
		}
	})
	.wrap(Math.min(100, yargs.terminalWidth()))
	.help()
	.parse();
