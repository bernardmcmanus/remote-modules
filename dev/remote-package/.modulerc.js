// const externals = new Set([
// 	'react',
// 	'core-js'
// ]);

module.exports = ({ ExternalMiddleware, UnionMiddleware, Scope, Shim }) => ({
	// [Scope('node')]: {
	// 	preset: 'node'
	// },
	// [Scope('browser')]: {
	// 	preset: 'browser',
	// 	provide: {
	// 		Buffer: `import { Buffer } from '${Shim('buffer')}'`
	// 	},
	// 	server: {
	// 		static: [
	// 			'dist/client.browser.js',
	// 		]
	// 	}
	// },
	middleware: [
		// ExternalMiddleware(ctx => externals.has(ctx.packageId)),
		// UnionMiddleware()
	]
});
