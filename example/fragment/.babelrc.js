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
		'jsx-control-statements',
		'@babel/proposal-class-properties',
		[
			'@babel/proposal-object-rest-spread',
			{
				useBuiltIns: true
			}
		]
	],
	env: {
		production: {
			plugins: ['@babel/transform-react-constant-elements', 'transform-react-remove-prop-types']
		}
	}
};
