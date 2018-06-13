module.exports = {
	['.']: () => require.resolve('.'),
	['../babel-polyfill-and-runtime']: () => require.resolve('../babel-polyfill-and-runtime'),
	['react']: () => require.resolve('react'),
	['no-exist']: () => require.resolve('no-exist')
};
