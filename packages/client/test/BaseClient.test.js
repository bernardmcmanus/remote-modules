import assert from 'assert';

import BaseClient from '../src/BaseClient';

describe('BaseClient', () => {
	describe('parseRequest', () => {
		it('should parse an import request', () => {
			const { namespace, scope, moduleId } = BaseClient.parseRequest('<namespace/@scope>moduleId');
			assert.equal(namespace, 'namespace');
			assert.equal(scope, '@scope');
			assert.equal(moduleId, 'moduleId');
		});

		it('should parse an import request without scope', () => {
			const { namespace, scope, moduleId } = BaseClient.parseRequest('<@scope>moduleId');
			assert.equal(namespace, undefined);
			assert.equal(scope, '@scope');
			assert.equal(moduleId, 'moduleId');
		});

		it('should parse an import request without scope', () => {
			const { namespace, scope, moduleId } = BaseClient.parseRequest('<namespace>moduleId');
			assert.equal(namespace, 'namespace');
			assert.equal(scope, undefined);
			assert.equal(moduleId, 'moduleId');
		});

		it('should parse an import request without namespace or scope', () => {
			const { namespace, scope, moduleId } = BaseClient.parseRequest('moduleId');
			assert.equal(namespace, undefined);
			assert.equal(scope, undefined);
			assert.equal(moduleId, 'moduleId');
		});

		it('should parse an undefined import request', () => {
			const { namespace, scope, moduleId } = BaseClient.parseRequest();
			assert.equal(namespace, undefined);
			assert.equal(scope, undefined);
			assert.equal(moduleId, '');
		});

		it('should parse an import request with multipart namespace', () => {
			const { namespace, scope, moduleId } = BaseClient.parseRequest('<namespace/foo>moduleId');
			assert.equal(namespace, 'namespace/foo');
			assert.equal(scope, undefined);
			assert.equal(moduleId, 'moduleId');
		});

		it('should parse an import request with multipart scope', () => {
			const { namespace, scope, moduleId } = BaseClient.parseRequest('<@scope/bar>moduleId');
			assert.equal(namespace, undefined);
			assert.equal(scope, '@scope/bar');
			assert.equal(moduleId, 'moduleId');
		});

		it('should parse an import request with multipart namespace and scope', () => {
			const { namespace, scope, moduleId } = BaseClient.parseRequest(
				'<namespace/foo/@scope/bar>moduleId'
			);
			assert.equal(namespace, 'namespace/foo');
			assert.equal(scope, '@scope/bar');
			assert.equal(moduleId, 'moduleId');
		});
	});
});
