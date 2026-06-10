import { test } from 'node:test';
import assert from 'node:assert';
import { renderReferencesHtml } from '../lib/blog.mjs';

test('renderReferencesHtml: 빈/undefined → 빈 문자열 (inert)', () => {
  assert.equal(renderReferencesHtml([], 'ko'), '');
  assert.equal(renderReferencesHtml(undefined, 'ko'), '');
});

test('renderReferencesHtml: 언어별 헤딩 + 항목 + 링크', () => {
  const refs = [{ pmid: '1', title: 'GH and height', journal: 'JCEM', year: 2020, doi: '10.1/x', url: 'https://pubmed.ncbi.nlm.nih.gov/1/', similarity: 0.8 }];
  const ko = renderReferencesHtml(refs, 'ko');
  assert.match(ko, /참고문헌/);
  assert.match(ko, /GH and height/);
  assert.match(ko, /JCEM\. 2020/);
  assert.match(ko, /pubmed\.ncbi\.nlm\.nih\.gov\/1\//);
  assert.match(ko, /doi\.org\/10\.1\/x/);
  assert.match(renderReferencesHtml(refs, 'th'), /เอกสารอ้างอิง/);
});

test('renderReferencesHtml: 미지원 lang → en 헤딩, HTML escape', () => {
  const refs = [{ pmid: '2', title: 'A & B <x>', journal: 'J', year: null, doi: null, url: '', similarity: 0.7 }];
  const out = renderReferencesHtml(refs, 'zz');
  assert.match(out, /References/);
  assert.match(out, /A &amp; B &lt;x&gt;/);
});
