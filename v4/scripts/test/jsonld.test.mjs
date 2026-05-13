import { test } from 'node:test';
import assert from 'node:assert';
import { medicalClinicJsonLd, physicianJsonLd, faqPageJsonLd } from '../lib/jsonld.mjs';

test('medicalClinicJsonLd returns valid schema', () => {
  const obj = medicalClinicJsonLd('ko');
  assert.equal(obj['@context'], 'https://schema.org');
  assert.equal(obj['@type'], 'MedicalClinic');
  assert.equal(obj.name, '연세새봄의원 187 성장클리닉');
  assert.equal(obj.medicalSpecialty, 'Pediatrics');
  assert.ok(obj.url.endsWith('/ko/'));
});

test('faqPageJsonLd builds Q&A list from seo.yml', () => {
  const obj = faqPageJsonLd('ko');
  assert.equal(obj['@type'], 'FAQPage');
  assert.ok(Array.isArray(obj.mainEntity));
  assert.ok(obj.mainEntity.length >= 5);
  assert.equal(obj.mainEntity[0]['@type'], 'Question');
});

test('faqPageJsonLd returns empty mainEntity if locale has no FAQ', () => {
  const obj = faqPageJsonLd('th');
  assert.deepEqual(obj.mainEntity, []);
});

test('physicianJsonLd worksFor MedicalClinic', () => {
  const obj = physicianJsonLd('ko');
  assert.equal(obj['@type'], 'Physician');
  assert.equal(obj.worksFor['@type'], 'MedicalClinic');
});
