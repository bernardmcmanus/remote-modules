module.exports = {
	presets: [
		[
			require.resolve('./node_modules/@babel/preset-env'),
			{
				modules: false,
				targets: {
					browsers: ['safari 8']
				},
				useBuiltIns: 'usage'
			}
		],
		[
			require.resolve('./node_modules/@babel/preset-react'),
			{ development: process.env.NODE_ENV === 'development' }
		]
	],
	plugins: [
		require.resolve('./node_modules/@babel/plugin-transform-object-assign'),
		require.resolve('./node_modules/babel-plugin-jsx-control-statements'),
		require.resolve('./node_modules/babel-plugin-relay'),
		require.resolve('./node_modules/babel-plugin-styled-components'),
		require.resolve('./node_modules/@babel/plugin-proposal-class-properties'),
		[
			require.resolve('./node_modules/@babel/plugin-proposal-object-rest-spread'),
			{ useBuiltIns: true }
		],
		[
			require.resolve('./node_modules/@babel/plugin-transform-runtime'),
			{
				polyfill: false,
				regenerator: false
			}
		]
	],
	env: {
		production: {
			plugins: [
				require.resolve('./node_modules/@babel/plugin-transform-react-constant-elements'),
				require.resolve('./node_modules/babel-plugin-transform-react-remove-prop-types')
			]
		}
	}
};
