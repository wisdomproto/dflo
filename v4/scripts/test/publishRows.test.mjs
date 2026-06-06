import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQueueRows } from '../../src/features/marketing/utils/publishRows.ts';

test('blog target → website 행 1개', () => {
  const rows = buildQueueRows({
    articleId: 'a1', language: 'th', contentKind: 'blog',
    targets: [{ channelId: null, channel: 'website' }],
  });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    article_id: 'a1', channel: 'website', channel_id: null,
    language: 'th', content_kind: 'blog', status: 'draft',
  });
});

test('social targets → 계정당 1행, 플랫폼 보존', () => {
  const rows = buildQueueRows({
    articleId: 'a2', language: 'ko', contentKind: 'cardnews',
    targets: [
      { channelId: 'c1', channel: 'instagram' },
      { channelId: 'c2', channel: 'facebook' },
    ],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].channel_id, 'c1');
  assert.equal(rows[0].channel, 'instagram');
  assert.equal(rows[1].channel, 'facebook');
  assert.ok(rows.every((r) => r.content_kind === 'cardnews' && r.status === 'draft'));
});

test('language 빈값 → ko 폴백', () => {
  const rows = buildQueueRows({
    articleId: 'a3', language: '', contentKind: 'post',
    targets: [{ channelId: null, channel: 'website' }],
  });
  assert.equal(rows[0].language, 'ko');
});
