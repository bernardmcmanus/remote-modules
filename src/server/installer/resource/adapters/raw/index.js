import Parser from '../parser';
import Reader from '../reader';
import Writer from '../writer';
import { createAdapter } from '../';

export default (C, { extension }) =>
	createAdapter({
		outputType: 'raw',
		parser: new Parser({
			buildQuery() {
				return '';
			},
			generate() {
				return this.source;
			},
			getRequests() {
				return [];
			},
			parse() {
				return {};
			},
			runQuery() {
				return [];
			}
		}),
		reader: new Reader({ encoding: null }),
		writer: new Writer({ extension, encoding: null })
	});
