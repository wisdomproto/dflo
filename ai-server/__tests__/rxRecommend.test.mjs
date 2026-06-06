import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRxPrompt } from '../dist/services/rxRecommend.js';

const input = {
  profile: '10.5세 남, 키 145cm, 뼈나이 11.5, PAH 171cm',
  labText: '[blood] Estradiol 27.2, IGF-1 543, VitD 18.2',
  cohortMeds: ['에이큐_G (somatropin(성장호르몬) · growth_hormone)', '루프린 (leuprorelin · gnrh_agonist)'],
  papers: [{ title: 'GH therapy in Korean children', journal: 'J Ped Endo', year: 2021, url: 'http://x', pop_group: 'east_asian' }],
};
test('prompt embeds profile, labs, annotated cohort meds, paper titles, and decision-support rules', () => {
  const p = buildRxPrompt(input);
  assert.match(p, /10\.5세/);
  assert.match(p, /Estradiol/);
  assert.match(p, /성장호르몬/);          // annotated med
  assert.match(p, /GH therapy in Korean/); // paper grounding
  assert.match(p, /자율 처방|최종.*의사/); // doctor-in-loop rule
});
test('handles empty papers/cohort gracefully', () => {
  const p = buildRxPrompt({ profile: 'x', labText: 'y', cohortMeds: [], papers: [] });
  assert.match(p, /x/);
});
