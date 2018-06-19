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
		],
		'@babel/react'
	],
	plugins: [
		'@babel/proposal-class-properties',
		[
			'@babel/proposal-object-rest-spread',
			{
				useBuiltIns: true
			}
		]
	]
};
