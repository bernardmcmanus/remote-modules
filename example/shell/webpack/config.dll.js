import Path from 'path';

import { DefinePlugin, DllPlugin, NamedModulesPlugin } from 'webpack';

export default {
	devtool: 'source-map',
	entry: ['classcat', 'prop-types', 'react', 'react-dom', 'react-helmet', 'universal-router'],
	output: {
		path: Path.resolve('dist/static'),
		publicPath: '/static',
		filename: 'dll.js',
		library: 'require'
	},
	mode: process.env.NODE_ENV || 'development',
	plugins: [
		new DefinePlugin({
			'process.browser': true
		}),
		new DllPlugin({
			name: 'require',
			path: Path.resolve('dist/static/.manifest.json')
		}),
		new NamedModulesPlugin()
	]
};
