import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePubmedXml } from '../dist/services/pubmed.js';

const xml = `<PubmedArticleSet><PubmedArticle><MedlineCitation>
<PMID>12345678</PMID>
<Article><ArticleTitle>Growth hormone in Korean children</ArticleTitle>
<Abstract><AbstractText>This study evaluated final height.</AbstractText></Abstract>
<Journal><JournalIssue><PubDate><Year>2021</Year></PubDate></JournalIssue><Title>J Pediatr Endocrinol</Title></Journal>
<AuthorList><Author><AffiliationInfo><Affiliation>Dept Pediatrics, Seoul, Korea</Affiliation></AffiliationInfo></Author></AuthorList>
</Article></MedlineCitation></PubmedArticle></PubmedArticleSet>`;

test('parsePubmedXml extracts pmid/title/abstract/year/journal/affiliation', () => {
  const arr = parsePubmedXml(xml);
  assert.equal(arr.length, 1);
  assert.equal(arr[0].pmid, '12345678');
  assert.match(arr[0].title, /Korean children/);
  assert.match(arr[0].abstract, /final height/);
  assert.equal(arr[0].year, 2021);
  assert.match(arr[0].journal, /Pediatr/);
  assert.match(arr[0].affiliation, /Seoul/);
});
test('multiple AbstractText sections concatenated', () => {
  const x = xml.replace('<AbstractText>This study evaluated final height.</AbstractText>',
    '<AbstractText Label="BACKGROUND">BG text.</AbstractText><AbstractText Label="RESULTS">RES text.</AbstractText>');
  const a = parsePubmedXml(x)[0];
  assert.match(a.abstract, /BG text/);
  assert.match(a.abstract, /RES text/);
});

test('parsePubmedXml extracts doi and publicationTypes', () => {
  const x = xml
    .replace('</Article>',
      '<PublicationTypeList><PublicationType UI="D016428">Journal Article</PublicationType>' +
      '<PublicationType UI="D016449">Randomized Controlled Trial</PublicationType></PublicationTypeList></Article>')
    .replace('</PubmedArticle>',
      '<PubmedData><ArticleIdList><ArticleId IdType="pubmed">12345678</ArticleId>' +
      '<ArticleId IdType="doi">10.1210/jc.2021-001</ArticleId></ArticleIdList></PubmedData></PubmedArticle>');
  const a = parsePubmedXml(x)[0];
  assert.equal(a.doi, '10.1210/jc.2021-001');
  assert.deepEqual(a.publicationTypes, ['Journal Article', 'Randomized Controlled Trial']);
});

test('parsePubmedXml defaults doi/publicationTypes when absent', () => {
  const a = parsePubmedXml(xml)[0];
  assert.equal(a.doi, '');
  assert.deepEqual(a.publicationTypes, []);
});
