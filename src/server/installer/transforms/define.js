import transformDefine from 'babel-plugin-transform-define';

import once from '../../../lib/helpers/once';

export default () => ({
	inherits: transformDefine,
	visitor: {
		Program: once((path, state) => {
			// eslint-disable-next-line no-param-reassign
			state.opts = state.opts.define;
		})
	}
});
