import logger from '../../lib/logger';

export default () => {
	const { NODE_ENV } = process.env;
	return async (ctx, next) => {
		const start = process.hrtime();
		try {
			await next();
		} catch (err) {
			ctx.status = err.status || 500;
			ctx.app.emit('error', err, ctx);
			if (NODE_ENV === 'development') {
				ctx.body = err.stack;
			}
		} finally {
			if (!ctx.state.noLog) {
				const [s, ns] = process.hrtime(start);
				const ms = s * 1e3 + ns * 1e-6;
				const time = `${ms.toFixed(3)}ms`;
				const httpVersion = `HTTP/${ctx.req.httpVersion}`;
				const size = ctx.length || 0;
				const output = `"${ctx.method} ${ctx.url} ${httpVersion}" ${ctx.status} ${size} [${time}]`;
				switch (true) {
					case ctx.status >= 400 && ctx.status < 500:
						logger.warn(output);
						break;
					case ctx.status >= 500:
						logger.error(output);
						break;
					default:
						logger.info(output);
						break;
				}
			}
		}
	};
};
