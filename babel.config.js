module.exports = {
	presets: [
		[
			'@babel/env',
			{
				modules: process.env.BABEL_TARGET === 'es' ? false : undefined,
				targets: {
					node: '8'
				}
			}
		],
		'@babel/typescript'
	],
	plugins: ['@babel/proposal-class-properties']
};
