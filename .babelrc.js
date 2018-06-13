module.exports = {
	presets: [
		[
			'@babel/env',
			{
				targets: {
					node: 'current'
				},
				useBuiltIns: 'usage'
			}
		]
	],
	plugins: [
		'@babel/proposal-class-properties',
		[
			'@babel/proposal-object-rest-spread',
			{
				useBuiltIns: true
			}
		],
		[
			'@babel/transform-runtime',
			{
				polyfill: false,
				regenerator: false
			}
		]
	],
	env: {
		test: {
			plugins: ['istanbul']
		}
	}
};
