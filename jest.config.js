module.exports = {
	automock: false,
	coverageReporters: ['json', 'lcov', 'text', 'text-summary'],
	// coverageThreshold: {
	// 	global: {
	// 		branches: 80,
	// 		functions: 80,
	// 		lines: 80,
	// 		statements: 80
	// 	}
	// },
	roots: ['<rootDir>/packages'],
	transform: {
		'\\.(j|t)s$': 'babel-jest'
	},
	testRegex: '\\.test\\.(j|t)s$',
	moduleFileExtensions: ['js', 'ts', 'json']
};
