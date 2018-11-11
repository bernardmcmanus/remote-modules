import fs from 'fs';
import { inspect } from 'util';

import { createLogger, format, transports } from 'winston';

function getDefault(key: string) {
	switch (key) {
		case 'label':
			return JSON.parse(fs.readFileSync('package.json', 'utf8')).name;
		case 'level':
			return process.env.LOG_LEVEL || 'info';
		default:
			throw new Error(`No default value for key '${key}'`);
	}
}

export type LoggerOptions = {
	level?: string;
	label?: string;
};

export function Logger(opts: LoggerOptions = {}) {
	const { label = getDefault('label'), level = getDefault('level') } = opts;
	return createLogger({
		level,
		format: format.combine(
			format.colorize(),
			format.label({ label }),
			format.timestamp(),
			format.printf(
				info =>
					`${info.timestamp} [${info.label}] ${info.level}: ${info.stack ||
						(typeof info.message === 'object'
							? inspect(info.message, { colors: true })
							: info.message)}`
			)
		),
		transports: [new transports.Console()]
	});
}

export default Logger();
