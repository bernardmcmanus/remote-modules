const { FRAGMENT_NAME, NODE_ENV } = process.env;

const externals = new Set([
	'classcat',
	'prop-types',
	'react',
	'react-dom',
	'react-helmet',
	'universal-router'
]);

module.exports = ({ Scope, BundleMiddleware, ExternalMiddleware, GenericMiddleware }) => ({
	define: {
		'process.env.FRAGMENT_NAME': FRAGMENT_NAME
	},
	extensions: ['.less'],
	middleware: [
		NODE_ENV === 'production' && BundleMiddleware(),
		BundleMiddleware({
			maxSize: Infinity,
			template: '{packageId}',
			test: resource => resource.packageId === 'core-js'
		})
	],
	server: {
		port: 3000,
		uri: `http://localhost/fragments/${FRAGMENT_NAME}`
	},
	[Scope('browser')]: {
		preset: 'browser',
		babel: {
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
		},
		middleware: [
			/**
			 * Webpack DllPlugin needs relative module paths
			 * (i.e. ./node_modules/react/index.js) instead
			 * of unresolved package requests (i.e. react).
			 */
			GenericMiddleware(
				ctx => externals.has(ctx.packageId),
				ctx => {
					ctx.external = true;
					ctx.force = `./${ctx.slug}`;
				}
			)
		]
	},
	[Scope('node')]: {
		preset: 'node',
		babel: {
			presets: [
				[
					'@babel/env',
					{
						modules: false,
						targets: {
							node: 'current'
						},
						useBuiltIns: 'usage'
					}
				]
			]
		},
		middleware: [ExternalMiddleware(ctx => externals.has(ctx.packageId))]
	}
});
