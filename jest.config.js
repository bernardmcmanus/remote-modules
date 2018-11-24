module.exports = {
	automock: false,
	testEnvironment: 'node',
	coverageReporters: ['html', 'json', 'lcov', 'text', 'text-summary'],
	collectCoverageFrom: ['packages/*/src/**/*.{j,t}s'],
	coveragePathIgnorePatterns: ['/dist/', '/node_modules/', '/test/', '/test-package/'],
	coverageThreshold: {
		global: {
			branches: 73,
			functions: 76,
			lines: 71,
			statements: 71
		}
	},
	roots: ['<rootDir>/packages'],
	transform: {
		'\\.(j|t)s$': 'babel-jest'
	},
	testRegex: '\\.test\\.(j|t)s$',
	moduleFileExtensions: ['js', 'ts', 'json']
};
