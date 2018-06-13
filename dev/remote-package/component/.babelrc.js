module.exports = {
	extends: require.resolve('../.babelrc'),
	presets: [
		// This should prevent regenerator-runtime from being pulled in by ../.babelrc
		[
			require.resolve('../node_modules/@babel/preset-env'),
			{
				targets: {
					node: 'current'
				},
				useBuiltIns: 'usage'
			}
		]
	]
};
