import Path from 'path';

import { DefinePlugin } from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import TerserPlugin from 'terser-webpack-plugin';

// eslint-disable-next-line no-process-env
const { NODE_ENV } = process.env;

function production(value = true) {
	return NODE_ENV === 'production' && value;
}

export default {
	devtool: `${production('hidden') || 'eval'}-source-map`,
	entry: Path.resolve('src/browser'),
	output: {
		path: Path.resolve('dist'),
		filename: 'client.browser.js',
		library: 'ImportClient',
		libraryExport: 'default'
	},
	resolve: {
		extensions: ['.js', '.ts'],
		symlinks: false
	},
	mode: production(NODE_ENV) || 'development',
	optimization: {
		minimizer: [
			new TerserPlugin({
				parallel: true,
				sourceMap: true
			})
		]
	},
	plugins: [
		new DefinePlugin({
			'process.browser': true
		}),
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
				test: /\.(j|t)s$/,
				exclude: {
					test: /\/node_modules\//,
					not: [/\/@remote-modules\//]
				},
				use: {
					loader: 'babel-loader',
					options: {
						configFile: true,
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
			}
		]
	}
};
