import Template from '@babel/template';

import pick from '../../../../lib/helpers/pick';

const template = Template(`
	NAMESPACE["KEY"] = function(exports, $require, module, __filename, __dirname) {
		delete NAMESPACE["KEY"];
		return module.define(META, function() {
			BODY
		});
	},
	NAMESPACE;
`);

export default ({ meta, body }) =>
	template({
		NAMESPACE: 'this',
		KEY: `pid:${meta.pid}`,
		META: JSON.stringify(pick(meta, ['moduleId', 'pid']), null, 2),
		BODY: body
	});
