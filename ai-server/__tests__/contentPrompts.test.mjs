import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBasePrompt, buildTopicPrompt, buildRewritePrompt, buildBlogPrompt } from '../dist/services/contentPrompts.js';

const cfg = { brand_name: '187', brand_description: '소아 성장', blog_rules: 'R', blog_categories: [{ code: 'A', name: '성장과학', context: 'ctx' }] };

test('buildBasePrompt includes brand, title, category context, keywords, HTML instruction', () => {
  const p = buildBasePrompt(cfg, { title: '키 크는 법', category: 'A', keywords: ['성장호르몬'], language: 'ko' });
  assert.match(p, /187/);
  assert.match(p, /키 크는 법/);
  assert.match(p, /성장과학/);
  assert.match(p, /성장호르몬/);
  assert.match(p, /HTML/);
});
test('buildBasePrompt switches language for non-ko', () => {
  const p = buildBasePrompt(cfg, { title: 't', language: 'th' });
  assert.match(p, /th/);
});
test('buildTopicPrompt asks for JSON array of N topics', () => {
  const p = buildTopicPrompt(cfg, { count: 5, category: 'A' });
  assert.match(p, /JSON/);
  assert.match(p, /5/);
});
test('buildRewritePrompt embeds the selected passage and instruction', () => {
  const p = buildRewritePrompt(cfg, { selection: '이 문장', instruction: '더 짧게' });
  assert.match(p, /이 문장/);
  assert.match(p, /더 짧게/);
});
test('buildBlogPrompt mentions JSON, keyword, and channel', () => {
  const p = buildBlogPrompt(cfg, { title: '키 크는 법', primaryKeyword: '성장호르몬', channel: 'naver_blog' });
  assert.match(p, /JSON/);
  assert.match(p, /성장호르몬/);
  assert.match(p, /키 크는 법/);
});
