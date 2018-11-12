#!/usr/bin/env node

import yargs from 'yargs';

yargs
	.usage('Usage: $0 <command> [options]')
	.help()
	.command({
		command: 'print-config [options]',
		describe: 'Display the assembled config object(s)',
		handler: async () => {}
	})
	.command({
		command: 'build [entry] [options]',
		describe: 'Compile the project',
		handler: async () => {}
	})
	.command({
		command: 'start [entry] [options]',
		describe: 'Start the server',
		handler: async () => {}
	})
	.wrap(Math.min(100, yargs.terminalWidth()))
	.parse();
