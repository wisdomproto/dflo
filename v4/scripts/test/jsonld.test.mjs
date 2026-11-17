import { test } from 'node:test';
import assert from 'node:assert';
import { medicalClinicJsonLd, physicianJsonLd, authorPageJsonLd, faqPageJsonLd } from '../lib/jsonld.mjs';

test('medicalClinicJsonLd returns valid schema', () => {
  const obj = medicalClinicJsonLd('ko');
  assert.equal(obj['@context'], 'https://schema.org');
  assert.equal(obj['@type'], 'MedicalClinic');
  assert.equal(obj.name, '187growup — 187 Growth Clinic');
  assert.deepEqual(obj.alternateName, ['187성장클리닉', '187 Growth Clinic', '187growup']);
  assert.equal(obj.slogan, '187growup powered by Yonsei Saebom Medical Clinic');
  assert.deepEqual(obj.parentOrganization, {
    '@type': 'MedicalOrganization',
    name: 'Yonsei Saebom Medical Clinic',
    alternateName: ['연세새봄의원', 'Yonsei Saebom Clinic'],
    url: 'https://www.yssaebomq.com/',
  });
  assert.deepEqual(obj.sameAs, [
    'https://www.yssaebomq.com/',
    'https://www.yssaebom.com/',
    'https://www.youtube.com/@187growup',
  ]);
  assert.ok(!('medicalSpecialty' in obj));
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
  // id is a stub locale with no seo.yml FAQ entries yet (ja/es now have FAQ)
  const obj = faqPageJsonLd('id');
  assert.deepEqual(obj.mainEntity, []);
});

test('physicianJsonLd worksFor MedicalClinic', () => {
  for (const obj of [physicianJsonLd('ko'), authorPageJsonLd('ko')]) {
    assert.equal(obj['@type'], 'Physician');
    assert.equal(obj.worksFor['@type'], 'MedicalClinic');
    assert.equal(obj.worksFor.name, '187growup — 187 Growth Clinic');
    assert.deepEqual(obj.knowsAbout, ['Child growth', 'Bone age', 'Puberty']);
    assert.ok(!('medicalSpecialty' in obj));
  }
});
