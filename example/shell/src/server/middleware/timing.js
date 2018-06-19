const { NODE_ENV } = process.env;

export default () => async (ctx, next) => {
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
		const [s, ns] = process.hrtime(start);
		const ms = (s * 1e3 + ns * 1e-6).toFixed(3);
		if (!ctx.state.noLog) {
			console.info(`"${ctx.method} ${ctx.url}" ${ctx.status} ${ctx.length || 0} [${ms}ms]`);
		}
	}
};
