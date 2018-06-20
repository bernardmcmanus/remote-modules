module.exports = {
	presets: [
		[
			'@babel/env',
			{
				targets: {
					node: 'current'
				}
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
		]
	],
	env: {
		test: {
			plugins: ['istanbul']
		}
	}
};
