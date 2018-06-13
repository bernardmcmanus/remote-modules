import * as babylon from '@babel/parser';
import * as babel from '@babel/core';
import * as t from '@babel/types';
import generate from '@babel/generator';
import Template from '@babel/template';

const manifestTemplate = Template(`
	const IDENTITY = value => value;

	const PICK = (target, keys) =>
		keys.reduce((acc, key) => {
			acc[key] = target[key];
			return acc;
		}, {});

	module.exports = ({
		KEYS = ['assetId', 'moduleId', 'pid', 'type'],
		FILTER = DEFAULT_FILTER,
		ASSET_MAP = {}
	} = {}) => MANIFEST;
`);

export default manifest => {
	const { dependencies, meta, ...other } = manifest.toJSON();
	const keysIdentifier = t.Identifier('keys');
	const pickIdentifier = t.Identifier('pick');
	const identityIdentifier = t.Identifier('identity');
	const filterIdentifier = t.Identifier('dependencyFilter');
	const assetMapIdentifier = t.Identifier('assetMap');

	function buildMetaObjectExpression(value) {
		const metaObjectExpression = babylon.parseExpression(JSON.stringify(value));
		const assetMetaExpression = t.MemberExpression(
			assetMapIdentifier,
			t.StringLiteral(value.outputSlug),
			true
		);
		metaObjectExpression.properties.push(
			t.ObjectProperty(
				t.StringLiteral('assetId'),
				t.ConditionalExpression(
					assetMetaExpression,
					t.BinaryExpression('+', t.StringLiteral('~/'), assetMetaExpression),
					t.StringLiteral(value.moduleId)
				)
			)
		);
		return metaObjectExpression;
	}

	function buildPickExpression(value) {
		return t.CallExpression(
			t.ConditionalExpression(keysIdentifier, pickIdentifier, identityIdentifier),
			[t.isIdentifier(value) ? value : buildMetaObjectExpression(value), keysIdentifier]
		);
	}

	function buildDependenciesCallExpression(filterNode) {
		return t.CallExpression(
			t.MemberExpression(
				t.ArrayExpression(dependencies.map(value => buildMetaObjectExpression(value))),
				t.Identifier('filter')
			),
			[filterNode]
		);
	}

	let ast = t.Program(
		manifestTemplate({
			PICK: pickIdentifier,
			IDENTITY: identityIdentifier,
			KEYS: keysIdentifier,
			FILTER: filterIdentifier,
			DEFAULT_FILTER: t.ArrowFunctionExpression(
				[t.Identifier('meta')],
				t.BinaryExpression('===', t.Identifier('meta.type'), t.StringLiteral(meta.type))
			),
			MANIFEST: t.ObjectExpression([
				t.ObjectProperty(t.StringLiteral('meta'), buildPickExpression(meta)),
				...Object.entries(other).map(([key, value]) =>
					t.ObjectProperty(t.StringLiteral(key), babylon.parseExpression(JSON.stringify(value)))
				),
				t.ObjectProperty(
					t.StringLiteral('dependencies'),
					t.CallExpression(
						t.MemberExpression(
							buildDependenciesCallExpression(filterIdentifier),
							t.Identifier('map')
						),
						[
							t.ArrowFunctionExpression(
								[t.Identifier('meta')],
								buildPickExpression(t.Identifier('meta'))
							)
						]
					)
				),
				t.ObjectProperty(
					t.StringLiteral('exclusions'),
					t.CallExpression(
						t.MemberExpression(
							buildDependenciesCallExpression(
								t.ArrowFunctionExpression(
									[t.Identifier('meta')],
									t.UnaryExpression('!', t.CallExpression(filterIdentifier, [t.Identifier('meta')]))
								)
							),
							t.Identifier('map')
						),
						[t.ArrowFunctionExpression([t.Identifier('meta')], t.Identifier('meta.pid'))]
					)
				)
			]),
			ASSET_MAP: assetMapIdentifier
		})
	);
	({ ast } = babel.transformFromAst(ast, null, {
		ast: true,
		babelrc: false,
		presets: [
			[
				'@babel/env',
				{
					targets: {
						node: 'current'
					}
				}
			]
		]
	}));
	return generate(ast).code;
};
