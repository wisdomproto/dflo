import test from 'node:test';
import assert from 'node:assert/strict';
import { annotateMedName, isNonDrugName } from '../dist/services/medLegend.js';

const legend = [
  { display_name:'에이큐_G', generic_name:'somatropin(성장호르몬)', drug_class:'growth_hormone', is_growth_core:true, is_non_drug:false },
  { display_name:'get_photo', generic_name:'', drug_class:'non_drug', is_growth_core:false, is_non_drug:true },
];
test('annotateMedName attaches generic + class for known code', () => {
  const r = annotateMedName('에이큐_G', legend);
  assert.match(r, /성장호르몬/);
  assert.match(r, /growth_hormone/);
});
test('annotateMedName returns name as-is when unknown', () => {
  assert.equal(annotateMedName('미지의약', legend), '미지의약');
});
test('isNonDrugName flags non-drug entries', () => {
  assert.equal(isNonDrugName('get_photo', legend), true);
  assert.equal(isNonDrugName('에이큐_G', legend), false);
});
