import Deferred from '../../lib/helpers/deferred';

const { XMLHttpRequest } = global;

function parseHeaders(xhr) {
	return xhr
		.getAllResponseHeaders()
		.split('\n')
		.filter(Boolean)
		.reduce((acc, line) => {
			const [, key, value] = line.match(/^([^:]+):\s(.+)/);
			acc[key.toLowerCase()] = value;
			return acc;
		}, {});
}

export default function Request() {
	return (url, { method = 'GET', headers = {} }) =>
		new Promise((resolve, reject) => {
			const deferred = Deferred();
			const xhr = new XMLHttpRequest();
			const res = {
				get status() {
					return xhr.status;
				},
				get body() {
					return xhr.response;
				},
				get ok() {
					return res.status < 400;
				},
				json: async () => {
					await deferred.promise;
					return JSON.parse(res.body);
				},
				text: async () => {
					await deferred.promise;
					return res.body;
				}
			};

			xhr.addEventListener('readystatechange', () => {
				switch (xhr.readyState) {
					case xhr.HEADERS_RECEIVED:
						res.headers = parseHeaders(xhr);
						resolve(res);
						break;

					case xhr.DONE:
						deferred.resolve();
						break;

					default:
						// noop
						break;
				}
			});

			xhr.addEventListener('error', reject);

			xhr.open(method, url);

			Object.entries(headers).forEach(([key, value]) => {
				xhr.setRequestHeader(key, value);
			});

			xhr.send();
		});
}
