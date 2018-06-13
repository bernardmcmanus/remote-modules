import { inspect } from 'util';

import colors from 'colors/safe';

import escapeRegExp from '../helpers/escapeRegExp';
import { Logger } from './';

colors.setTheme({
	trace: 'magenta',
	debug: 'cyan',
	info: 'green',
	warn: 'yellow',
	error: 'red',
	fatal: 'rainbow'
});

function formatSrc({ file, line }) {
	const pattern = new RegExp(`^${escapeRegExp(process.cwd())}/(node_modules/)?`);
	const location = file.replace(pattern, '');
	return colors.gray(`${location}:${line}`);
}

function format({ err, level, msg, name, src, time, ...other }) {
	const levelName = Logger.nameFromLevel[level];
	return [
		time.toISOString(),
		`${colors[levelName](levelName)}:`,
		`[${name}${src ? ` ${formatSrc(src)}` : ''}]`,
		err ? err.stack || err.message || err : null,
		err ? null : msg,
		!msg && !err ? `\n${inspect(other, { colors: true })}` : null
	]
		.filter(Boolean)
		.join(' ');
}

function write({ v: _, ...rec }) {
	switch (true) {
		case rec.level === Logger.WARN:
			// eslint-disable-next-line no-console
			console.warn(format(rec));
			break;
		case rec.level >= Logger.ERROR:
			// eslint-disable-next-line no-console
			console.error(format(rec));
			break;
		default:
			// eslint-disable-next-line no-console
			console.log(format(rec));
			break;
	}
}

export default function FormattedStream() {
	return { write };
}
