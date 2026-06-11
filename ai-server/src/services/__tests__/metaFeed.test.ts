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

test('mapFbPost: 프로필/커버 사진 변경 스토리는 제외', () => {
  assert.equal(mapFbPost({ id: 's1', full_picture: 'https://t/logo.jpg', attachments: { data: [{ media_type: 'photo', type: 'profile_media' }] } }), null);
  assert.equal(mapFbPost({ id: 's2', attachments: { data: [{ media_type: 'photo', type: 'cover_photo' }] } }), null);
  // 일반 사진/앨범은 통과
  assert.equal(mapFbPost({ id: 's3', full_picture: 'https://t/x.jpg', attachments: { data: [{ media_type: 'photo', type: 'photo' }] } })?.postKind, 'feed');
});

test('mapFbPost: postKind — 동영상은 릴스, 그 외 피드', () => {
  assert.equal(mapFbPost({ id: 'p1', attachments: { data: [{ media_type: 'album' }] } })?.postKind, 'feed');
  assert.equal(mapFbPost({ id: 'p2', attachments: { data: [{ media_type: 'video_inline' }] } })?.postKind, 'reels');
  assert.equal(mapFbPost({ id: 'p3', full_picture: 'https://t/x.jpg' })?.postKind, 'feed');
});

test('mapIgMedia: postKind — REELS 는 릴스, STORY 는 제외', () => {
  assert.equal(mapIgMedia({ id: 'r1', media_type: 'VIDEO', media_product_type: 'REELS', thumbnail_url: 'https://t/r.jpg' })?.postKind, 'reels');
  assert.equal(mapIgMedia({ id: 'f1', media_type: 'IMAGE', media_product_type: 'FEED', media_url: 'https://t/i.jpg' })?.postKind, 'feed');
  // FEED 동영상은 릴스가 아니라 피드
  assert.equal(mapIgMedia({ id: 'f2', media_type: 'VIDEO', media_product_type: 'FEED', thumbnail_url: 'https://t/v.jpg' })?.postKind, 'feed');
  // media_product_type 없으면 media_type 으로 폴백
  assert.equal(mapIgMedia({ id: 'f3', media_type: 'VIDEO', thumbnail_url: 'https://t/v.jpg' })?.postKind, 'reels');
  assert.equal(mapIgMedia({ id: 's1', media_type: 'IMAGE', media_product_type: 'STORY', media_url: 'https://t/s.jpg' }), null);
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
