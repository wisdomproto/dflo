import { test } from 'node:test';
import assert from 'node:assert';
import { renderReferencesHtml } from '../lib/blog.mjs';

test('renderReferencesHtml: 빈/undefined → 빈 문자열 (inert)', () => {
  assert.equal(renderReferencesHtml([], 'ko'), '');
  assert.equal(renderReferencesHtml(undefined, 'ko'), '');
});

test('renderReferencesHtml: 헤딩(전 로케일 영어 References) + 항목 + 링크', () => {
  const refs = [{ pmid: '1', title: 'GH and height', journal: 'JCEM', year: 2020, doi: '10.1/x', url: 'https://pubmed.ncbi.nlm.nih.gov/1/', similarity: 0.8 }];
  const ko = renderReferencesHtml(refs, 'ko');
  assert.match(ko, /References/);
  assert.match(ko, /GH and height/);
  assert.match(ko, /JCEM\. 2020/);
  assert.match(ko, /pubmed\.ncbi\.nlm\.nih\.gov\/1\//);
  assert.match(ko, /doi\.org\/10\.1\/x/);
  // 항목은 영어이므로 헤딩도 로케일 무관 영어 — th 도 References.
  assert.match(renderReferencesHtml(refs, 'th'), /References/);
});

test('renderReferencesHtml: 미지원 lang → en 헤딩, HTML escape', () => {
  const refs = [{ pmid: '2', title: 'A & B <x>', journal: 'J', year: null, doi: null, url: '', similarity: 0.7 }];
  const out = renderReferencesHtml(refs, 'zz');
  assert.match(out, /References/);
  assert.match(out, /A &amp; B &lt;x&gt;/);
});
