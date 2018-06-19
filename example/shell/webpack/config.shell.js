import Path from 'path';

import { DefinePlugin, DllReferencePlugin } from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const { NODE_ENV } = process.env;

function production(value = true) {
	return NODE_ENV === 'production' && value;
}

export default {
	devtool: `${production('hidden') || 'inline'}-source-map`,
	entry: [Path.resolve('src/app/index.browser')],
	output: {
		path: Path.resolve('dist/static'),
		publicPath: '/static',
		filename: 'shell.js'
	},
	mode: production(NODE_ENV) || 'development',
	resolve: {
		extensions: ['.js', '.jsx', '.json']
	},
	externals: [
		(context, request, cb) => {
			if (request === 'remote-module') {
				cb(null, 'window ImportClient');
			} else {
				cb();
			}
		}
	],
	plugins: [
		new DefinePlugin({
			'process.browser': true
		}),
		new DllReferencePlugin({
			manifest: Path.resolve('dist/static/.manifest.json')
		}),
		new CopyWebpackPlugin(
			[
				{
					from: 'node_modules/remote-module/dist/client.browser.js',
					to: 'remote-module/'
				},
				production({ from: 'static' })
			].filter(Boolean)
		)
	],
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						babelrc: true,
						presets: [
							[
								'@babel/env',
								{
									modules: false,
									targets: {
										browsers: ['> 0.25%', 'not dead']
									},
									useBuiltIns: 'usage'
								}
							]
						]
					}
				}
			}
		]
	}
};
