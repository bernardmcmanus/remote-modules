module.exports = {
	extends: '../../babel.config',
	presets: [
		[
			'@babel/env',
			{
				modules: process.env.BABEL_TARGET === 'es' ? false : undefined,
				targets: {
					node: '8'
				}
			}
		]
	]
};
