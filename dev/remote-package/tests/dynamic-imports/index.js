// Static import
import './import';

// Dynamic import / expression
exports.importExpression = import(
	(() => Math.ceil(1e-6) && `${'./import'}`)()
);

// Dynamic import / await
exports.import = (async () => {
	const dynamicImport = await import('./import');
	return dynamicImport;
})();

// System.import
exports.system = System.import('./system.import');
