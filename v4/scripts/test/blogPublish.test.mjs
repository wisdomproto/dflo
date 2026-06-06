import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, buildPublishedBlog } from '../../src/features/marketing/utils/blogPublish.ts';

const base = {
  id: 'abcdef1234567890', topicId: null, category: '', keywords: [],
  language: 'ko', status: 'draft', createdAt: '', updatedAt: '',
  confirmed: false, sortOrder: 0,
};

test('slugify: 영문 소문자·하이픈', () => {
  assert.equal(slugify('Growth Hormone Guide'), 'growth-hormone-guide');
});

test('slugify: 한글 보존, 양끝 하이픈 제거', () => {
  assert.equal(slugify('  소아 성장!! '), '소아-성장');
});

test('마스터(ko) 본문으로 발행본 생성 + 슬러그에 id 접두', () => {
  const a = { ...base, title: '키 크는 법', body: '<p>잘 자고 잘 먹기</p>', translations: {} };
  const r = buildPublishedBlog(a, 'ko');
  assert.equal(r.seoTitle, '키 크는 법');
  assert.equal(r.htmlBody, '<p>잘 자고 잘 먹기</p>');
  assert.equal(r.metaDescription, '잘 자고 잘 먹기');
  assert.equal(r.slug, '키-크는-법-abcdef12');
});

test('번역(th) 본문 사용', () => {
  const a = {
    ...base, title: '키 크는 법', body: '<p>ko</p>',
    translations: { th: { title: 'วิธีเพิ่มความสูง', body: '<p>นอนหลับ</p>' } },
  };
  const r = buildPublishedBlog(a, 'th');
  assert.equal(r.seoTitle, 'วิธีเพิ่มความสูง');
  assert.equal(r.htmlBody, '<p>นอนหลับ</p>');
});

test('본문 비어있으면 throw', () => {
  const a = { ...base, title: 't', body: '   ', translations: {} };
  assert.throws(() => buildPublishedBlog(a, 'ko'), /본문/);
});
