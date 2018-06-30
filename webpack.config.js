import Path from 'path';

import { DefinePlugin, NormalModuleReplacementPlugin } from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

import escapeRegExp from './src/lib/helpers/escapeRegExp';

import pkg from './package.json';

// eslint-disable-next-line no-process-env
const { NODE_ENV } = process.env;

function production(value = true) {
	return NODE_ENV === 'production' && value;
}

export default {
	devtool: `${production('hidden') || 'inline'}-source-map`,
	entry: Path.resolve('src/client'),
	output: {
		path: Path.resolve('dist'),
		filename: 'client.browser.js',
		library: 'ImportClient',
		libraryExport: 'default'
	},
	mode: production(NODE_ENV) || 'development',
	resolve: {
		alias: {
			url$: Path.resolve('src/client/shims/url'),
			vm$: Path.resolve('src/client/shims/vm')
		}
	},
	plugins: [
		new DefinePlugin({
			'process.browser': true
		}),
		new NormalModuleReplacementPlugin(
			new RegExp(escapeRegExp(Path.resolve('package.json'))),
			Path.resolve('src/client/shims/_package.json')
		),
		production(
			new BundleAnalyzerPlugin({
				analyzerMode: 'static',
				defaultSizes: 'parsed',
				reportFilename: '.report.html',
				openAnalyzer: false
			})
		)
	].filter(Boolean),
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						babelrc: true,
						presets: [
							[
								'@babel/env',
								{
									exclude: [
										// use fast-async instead
										'transform-async-to-generator',
										'transform-regenerator'
									],
									modules: false,
									targets: {
										browsers: ['> 0.25%', 'not dead']
									},
									useBuiltIns: 'usage'
								}
							]
						],
						plugins: [['module:fast-async', { spec: true }]]
					}
				}
			},
			{
				test: Path.resolve('package.json'),
				use: {
					loader: 'string-replace-loader',
					options: {
						multiple: [
							{
								search: 'WEBPACK_STRING_REPLACE_PKG_NAME',
								replace: pkg.name
							},
							{
								search: 'WEBPACK_STRING_REPLACE_PKG_VERSION',
								replace: pkg.version
							}
						],
						strict: true
					}
				}
			}
		]
	}
};
