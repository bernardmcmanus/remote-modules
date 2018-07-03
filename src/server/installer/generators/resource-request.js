import * as t from '@babel/types';
import traverse from '@babel/traverse';

import {
	formatAttributes,
	parseAttributes,
	stripAttributes
} from '../../../lib/request-attributes';
import defineProperties from '../../../lib/helpers/defineProperties';
import get from '../../../lib/helpers/get';
import once from '../../../lib/helpers/once';

function isImport(path) {
	if (path.findParent(({ node }) => t.isImport(node.callee))) {
		return true;
	}
	const callee = get(path.findParent(p => p.isCallExpression()), ['node', 'callee']);
	return (
		get(callee, ['object', 'name']) === 'System' && get(callee, ['property', 'name']) === 'import'
	);
}

function parseRequestPath(path) {
	const { value } = path.node;
	const { list, attributes } = parseAttributes(value);
	if (list) {
		path.replaceWith(t.StringLiteral(stripAttributes(value)));
	}
	return {
		...attributes,
		async: (isImport(path) && !list) || attributes.async
	};
}

function createRootNode(requestNode) {
	return t.File(
		t.Program([t.isExpression(requestNode) ? t.ExpressionStatement(requestNode) : requestNode])
	);
}

function getValueNode({ program }) {
	return (
		// ImportDeclaration
		program.body[0].source ||
		// CallExpression
		program.body[0].expression.arguments[0]
	);
}

function getValue(valueNode) {
	return t.isStringLiteral(valueNode) ? valueNode.value : undefined;
}

function replaceVariableNode(variables, path) {
	if (variables.has(path.node)) {
		path.replaceWith(t.StringLiteral('*'));
	}
}

function requestToGlob(requestNode, variables) {
	if (variables.size === 0) {
		return undefined;
	}

	const rootNode = createRootNode(requestNode);

	traverse(rootNode, {
		StringLiteral: once(path => {
			parseRequestPath(path);
		}),
		Expression(path) {
			if (!t.isLiteral(path.node)) {
				replaceVariableNode(variables, path);
			}
		},
		exit(path) {
			if (!t.isLiteral(path.node)) {
				const { confident, value } = path.evaluate();
				if (confident) {
					path.replaceWith(t.StringLiteral(value));
					path.skip();
				}
			}
		}
	});

	return getValue(getValueNode(rootNode));
}

export default (originalRequestNode, buildQuery) => {
	class VariableStore extends Set {
		add(node) {
			return super.add(buildQuery(node));
		}
		has(node) {
			return super.has(buildQuery(node));
		}
	}

	const requestNode = t.cloneDeep(originalRequestNode);
	const requestNodeCopy = t.cloneDeep(requestNode);
	const rootNode = createRootNode(requestNode);
	const variables = new VariableStore();
	const attributes = {};

	traverse(rootNode, {
		StringLiteral: once(path => {
			Object.assign(attributes, parseRequestPath(path));
		}),
		Expression(path) {
			if (
				!t.isLiteral(path.node) &&
				!t.isBinaryExpression(path.node) &&
				path.node !== requestNode &&
				path.parent !== requestNode
			) {
				if (t.isMemberExpression(path.node)) {
					if (!t.isLiteral(path.node.object)) {
						variables.add(path.node);
						path.skip();
					}
				} else if (t.isCallExpression(path.node) || t.isIdentifier(path.node)) {
					variables.add(path.node);
					path.skip();
				}
			}
		},
		exit(path) {
			if (!t.isLiteral(path.node)) {
				const { confident, value } = path.evaluate();
				if (confident) {
					path.replaceWith(t.StringLiteral(value));
					path.skip();
				}
			}
		}
	});

	const pattern = requestToGlob(requestNodeCopy, variables);
	const valueNode = getValueNode(rootNode);
	const value = getValue(valueNode);
	const attributesString = formatAttributes(attributes);
	const dynamic = typeof value !== 'string' || undefined;

	const requestObject = defineProperties(
		{
			...attributes,
			attributes: attributesString,
			dynamic,
			pattern,
			value
		},
		{
			getKey: (string = value) => [attributesString, string].join(''),
			node: {
				value: valueNode
			}
		}
	);

	return requestObject;
};
