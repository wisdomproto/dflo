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

// ── SEO blog path (blog[lang] 있을 때) ────────────────────────────────────────
const seoBase = {
  ...base,
  title: '성장호르몬 가이드',
  body: '<p>plain ko</p>',
  translations: {},
  blogReferences: [],
};

test('SEO 경로: blog[ko] 섹션이 있으면 섹션 HTML 사용', () => {
  const a = {
    ...seoBase,
    blog: {
      ko: {
        seoTitle: 'SEO 제목',
        slug: 'growth-guide',
        metaDescription: 'SEO meta',
        h1: 'H1 제목',
        primaryKeyword: '성장호르몬',
        secondaryKeywords: [],
        sections: [{ heading: '섹션1', html: '<p>섹션 본문</p>', imagePrompt: '', imageUrl: null }],
        faq: [],
      },
    },
  };
  const r = buildPublishedBlog(a, 'ko');
  assert.equal(r.seoTitle, 'SEO 제목');
  assert.equal(r.slug, 'growth-guide'); // SEO 위저드 slug 그대로 (id 접두 없음)
  assert.ok(r.htmlBody.includes('<h2>섹션1</h2>'), 'htmlBody should include section h2');
  assert.ok(r.htmlBody.includes('<p>섹션 본문</p>'), 'htmlBody should include section html');
  assert.ok(!r.htmlBody.includes('plain ko'), 'should NOT use plain body');
});

test('SEO 경로: h1만 있어도 SEO path 진입', () => {
  const a = {
    ...seoBase,
    blog: {
      ko: {
        seoTitle: 'SEO 제목2',
        slug: 'guide2',
        metaDescription: '',
        h1: 'H1만 있음',
        primaryKeyword: '',
        secondaryKeywords: [],
        sections: [],
        faq: [],
      },
    },
  };
  const r = buildPublishedBlog(a, 'ko');
  assert.equal(r.seoTitle, 'SEO 제목2');
  // sections 없으면 post-empty placeholder 가 htmlBody 에 들어가야 함
  assert.ok(r.htmlBody.includes('post-empty'), 'should include post-empty placeholder for empty sections');
});

test('SEO 경로: blog[lang]이 없으면 plain-body fallback', () => {
  const a = {
    ...seoBase,
    body: '<p>plain ko fallback</p>',
    blog: {},  // lang 키 없음
  };
  const r = buildPublishedBlog(a, 'ko');
  assert.equal(r.htmlBody, '<p>plain ko fallback</p>');
});

test('SEO 경로: FAQ가 htmlBody에 포함', () => {
  const a = {
    ...seoBase,
    blog: {
      ko: {
        seoTitle: 'FAQ 포함 제목',
        slug: 'faq-test',
        metaDescription: '',
        h1: 'FAQ 테스트',
        primaryKeyword: '',
        secondaryKeywords: [],
        sections: [{ heading: '본문', html: '<p>내용</p>', imagePrompt: '', imageUrl: null }],
        faq: [{ q: '질문1', a: '답변1' }],
      },
    },
  };
  const r = buildPublishedBlog(a, 'ko');
  assert.ok(r.htmlBody.includes('질문1'), 'htmlBody should include FAQ question');
  assert.ok(r.htmlBody.includes('답변1'), 'htmlBody should include FAQ answer');
  assert.ok(r.htmlBody.includes('자주 묻는 질문'), 'htmlBody should include ko FAQ heading');
});

test('SEO 경로: blogReferences 가 htmlBody 에 포함', () => {
  const a = {
    ...seoBase,
    blogReferences: [{ pmid: '1', title: 'Sleep study', journal: 'Pediatrics', year: 2020, doi: null, url: 'https://pubmed/1', similarity: 0.8 }],
    blog: {
      ko: {
        seoTitle: 'T', slug: 'ref-test', metaDescription: 'm', h1: 'H', primaryKeyword: '', secondaryKeywords: [],
        sections: [{ heading: 's', html: '<p>b</p>', imagePrompt: '', imageUrl: null }], faq: [],
      },
    },
  };
  const r = buildPublishedBlog(a, 'ko');
  assert.ok(r.htmlBody.includes('post-references'), 'htmlBody should include references section');
  assert.ok(r.htmlBody.includes('Sleep study'), 'htmlBody should include reference title');
});

test('SEO 경로: slug 비면 seoTitle 기반 + id 접두 폴백', () => {
  const a = {
    ...seoBase,
    blog: {
      ko: {
        seoTitle: 'Growth Guide', slug: '', metaDescription: 'm', h1: '', primaryKeyword: '', secondaryKeywords: [],
        sections: [{ heading: 's', html: '<p>b</p>', imagePrompt: '', imageUrl: 'u' }], faq: [],
      },
    },
  };
  const r = buildPublishedBlog(a, 'ko');
  assert.equal(r.slug, 'growth-guide-abcdef12');
});
