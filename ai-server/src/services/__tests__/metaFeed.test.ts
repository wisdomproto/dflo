import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapFbPost, mapIgMedia } from '../metaFeed.js';

test('mapFbPost: 미디어 타입 추론', () => {
  assert.equal(mapFbPost({ id: 'p1', attachments: { data: [{ media_type: 'album' }] } })?.mediaType, 'carousel');
  assert.equal(mapFbPost({ id: 'p2', attachments: { data: [{ media_type: 'video_inline' }] } })?.mediaType, 'video');
  assert.equal(mapFbPost({ id: 'p3', full_picture: 'https://t/x.jpg' })?.mediaType, 'image');
  assert.equal(mapFbPost({ id: 'p4', message: '텍스트만' })?.mediaType, 'text');
});

test('mapFbPost: id 없으면 null, 필드 매핑', () => {
  assert.equal(mapFbPost({}), null);
  const p = mapFbPost({
    id: '111_222', message: '카드뉴스 소개', created_time: '2026-06-01T00:00:00+0000',
    permalink_url: 'https://fb.com/111/posts/222', full_picture: 'https://t/full.jpg',
  });
  assert.equal(p?.postId, '111_222');
  assert.equal(p?.caption, '카드뉴스 소개');
  assert.equal(p?.permalink, 'https://fb.com/111/posts/222');
  assert.equal(p?.thumbnailUrl, 'https://t/full.jpg');
});

test('mapIgMedia: VIDEO 는 thumbnail_url, IMAGE 는 media_url', () => {
  const v = mapIgMedia({ id: 'm1', media_type: 'VIDEO', media_url: 'https://t/v.mp4', thumbnail_url: 'https://t/v.jpg' });
  assert.equal(v?.mediaType, 'video');
  assert.equal(v?.thumbnailUrl, 'https://t/v.jpg');
  const i = mapIgMedia({ id: 'm2', media_type: 'IMAGE', media_url: 'https://t/i.jpg' });
  assert.equal(i?.mediaType, 'image');
  assert.equal(i?.thumbnailUrl, 'https://t/i.jpg');
});

test('mapIgMedia: 캐러셀은 부모 media_url 없으면 첫 child 로 폴백', () => {
  const c = mapIgMedia({
    id: 'm3', media_type: 'CAROUSEL_ALBUM', permalink: 'https://ig.com/p/x',
    children: { data: [{ media_url: 'https://t/c1.jpg' }, { media_url: 'https://t/c2.jpg' }] },
  });
  assert.equal(c?.mediaType, 'carousel');
  assert.equal(c?.thumbnailUrl, 'https://t/c1.jpg');
  assert.equal(mapIgMedia({}), null);
});
