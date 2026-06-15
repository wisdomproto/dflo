import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapAudience } from '../metaAudiences.js';

test('mapAudience: id 없으면 null', () => {
  assert.equal(mapAudience({}), null);
});

test('mapAudience: 필드 매핑 + ready(op 200) + count', () => {
  const a = mapAudience({
    id: '1', name: '홈피 방문자', subtype: 'WEBSITE',
    approximate_count_lower_bound: 1200, operation_status: { code: 200 },
  });
  assert.equal(a?.id, '1');
  assert.equal(a?.name, '홈피 방문자');
  assert.equal(a?.subtype, 'WEBSITE');
  assert.equal(a?.approxCount, 1200);
  assert.equal(a?.ready, true);
});

test('mapAudience: op status 비정상 = ready false', () => {
  assert.equal(mapAudience({ id: '2', name: 'x', operation_status: { code: 414 } })?.ready, false);
});

test('mapAudience: operation_status 없으면 ready undefined, 이름 폴백', () => {
  const a = mapAudience({ id: '3' });
  assert.equal(a?.ready, undefined);
  assert.equal(a?.name, '(이름 없음)');
});
