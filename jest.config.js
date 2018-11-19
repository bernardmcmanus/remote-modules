module.exports = {
	automock: false,
	testEnvironment: 'node',
	coverageReporters: ['html', 'json', 'lcov', 'text', 'text-summary'],
	coveragePathIgnorePatterns: ['/dist/', '/node_modules/', '/test/', '/test-package/'],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80
		}
	},
	roots: ['<rootDir>/packages'],
	transform: {
		'\\.(j|t)s$': 'babel-jest'
	},
	testRegex: '\\.test\\.(j|t)s$',
	moduleFileExtensions: ['js', 'ts', 'json']
};
