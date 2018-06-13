import * as t from '@babel/types';

import getTemplate from './templates';
import once from '../../../lib/helpers/once';

export default (api, { outputTarget, meta }) => {
	const template = getTemplate(outputTarget);
	return {
		visitor: {
			Program: {
				exit: once(path => {
					const { body } = path.node;
					path.replaceWith(t.Program([template({ body, meta })]));
				})
			}
		}
	};
};
