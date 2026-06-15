import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRedeployRequest } from '../deployHook.js';

test('buildRedeployRequest: Railway GraphQL endpoint + bearer + variables', () => {
  const r = buildRedeployRequest('tok123', 'svc-1', 'env-1');
  assert.equal(r.url, 'https://backboard.railway.com/graphql/v2');
  assert.equal(r.method, 'POST');
  assert.equal(r.headers.Authorization, 'Bearer tok123');
  assert.equal(r.headers['Content-Type'], 'application/json');
  const parsed = JSON.parse(r.body);
  assert.match(parsed.query, /serviceInstanceRedeploy/);
  assert.deepEqual(parsed.variables, { serviceId: 'svc-1', environmentId: 'env-1' });
});
