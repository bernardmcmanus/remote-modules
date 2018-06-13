import Url from 'url';
import http from 'http';
import https from 'https';

import HttpAgent, { HttpsAgent } from 'agentkeepalive';

import Deferred from '../../lib/helpers/deferred';

export default function Request({ protocol, ...other }) {
	const provider = protocol === 'https:' ? https : http;
	const Agent = protocol === 'https:' ? HttpsAgent : HttpAgent;
	const agent = new Agent({
		maxSockets: 100,
		maxFreeSockets: 10,
		timeout: 60000,
		freeSocketKeepAliveTimeout: 30000,
		...other
	});

	return (url, opts) =>
		new Promise((resolve, reject) => {
			const req = provider.request({ agent, ...Url.parse(url), ...opts }, res => {
				const status = res.statusCode;
				const deferred = Deferred();
				let body = '';
				res.on('data', chunk => {
					body += chunk;
				});
				res.on('error', deferred.reject);
				res.on('end', deferred.resolve);
				resolve(
					Object.assign(res, {
						status,
						ok: status < 400,
						body: res,
						json: async () => {
							await deferred.promise;
							return JSON.parse(body);
						},
						text: async () => {
							await deferred.promise;
							return body;
						}
					})
				);
			});
			req.on('error', reject);
			req.end();
		});
}
