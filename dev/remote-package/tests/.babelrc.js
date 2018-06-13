module.exports = {
	extends: require.resolve('../.babelrc'),
	plugins: [
		require.resolve('../node_modules/babel-plugin-import-glob')
	]
};
