export default outputTarget => {
	try {
		// eslint-disable-next-line global-require, import/no-dynamic-require
		return require(`./${outputTarget}`).default;
	} catch (_err) {
		throw new Error(`Unknown output target '${outputTarget}'`);
	}
};
