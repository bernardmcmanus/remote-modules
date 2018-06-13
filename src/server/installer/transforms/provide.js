import * as babylon from '@babel/parser';
import * as t from '@babel/types';

import once from '../../../lib/helpers/once';

export default (api, { provide }) => ({
	visitor: {
		Program: once(path => {
			Object.entries(provide).forEach(([key, value]) => {
				if (typeof value === 'string') {
					path.scope.push({
						id: t.Identifier(key),
						init: babylon.parseExpression(value)
					});
				} else {
					path.unshiftContainer('body', value);
				}
			});
		})
	}
});
