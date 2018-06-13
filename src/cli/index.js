#!/usr/bin/env node

import { spawn } from 'child_process';

import yargs from 'yargs';

import Server from '../server';
import Installer from '../server/installer';
import ConfigStore from '../lib/config-store';
import logger from '../lib/logger';
import { pickDefined } from '../lib/helpers';
import { normalizeArrayOption, toPrimitive } from './helpers';

const C = new ConfigStore();

yargs
	.usage('Usage: $0 <command> [options]')
	.command({
		command: 'install [entry] [options]',
		desc: 'Prep the code you want to serve remotely',
		builder: program =>
			program
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
				.option('workers', {
					describe: 'Run multi-scope installs on worker processes',
					type: 'boolean',
					default: true
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
				}),
		handler: async argv => {
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
				scope: useScope,
				strict,
				target: outputTarget,
				workers,
				uglify,
				force,
				verbose
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

			const options = pickDefined(
				toPrimitive({
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
					strict,
					uglify,
					include
				})
			);

			try {
				C.init(options);
				if (useScope || C.scopes().length === 1) {
					const install = new Installer(C.use(useScope || C.scopes()[0]));
					await install(force);
				} else if (workers) {
					const [, ...args] = [...process.argv];
					if (!/\/dist\//.test(__filename)) {
						args.unshift('-r', '@babel/register');
					}
					await Promise.all(
						C.scopes().map(scope => {
							const scopeKey = ConfigStore.symbolOf(scope);
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
						C.scopes().map(scope => {
							const install = new Installer(C.use(scope));
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
			program
				.positional('entry', {
					describe: 'Install entrypoint',
					type: 'string',
					defaultDescription: '.'
				})
				.option('config', {
					alias: 'c',
					describe: 'Path to a .modulerc file',
					type: 'string',
					defaultDescription: C.defaults.config
				})
				.option('output', {
					alias: 'o',
					describe: 'Output directory',
					type: 'string',
					defaultDescription: '.remote'
				})
				.option('production', {
					alias: 'p',
					describe: 'Start in production mode',
					type: 'boolean',
					default: undefined,
					defaultDescription: false
				})
				.option('root', {
					alias: 'r',
					describe: 'Project root',
					type: 'string',
					defaultDescription: '.'
				})
				.option('scope', {
					alias: 's',
					describe: 'Config scope for multiple build variants',
					type: 'string',
					defaultDescription: undefined
				})
				.option('watch', {
					alias: 'w',
					describe: 'Watch for changes',
					type: 'boolean',
					default: undefined,
					defaultDescription: false
				}),
		handler: async ({ config, entry, output, production, root, scope, watch }) => {
			try {
				C.init(pickDefined({ config, entry, output, root, watch }));
				const server = new Server(scope ? C.use(scope) : C);
				// FIXME: this is a quick and dirty check to support production builds
				if (!production) {
					await server.install();
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
