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

const base = { profile: '10세 남아', labText: '검사', cohortMeds: ['성장호르몬'] };

test('buildRxPrompt injects abstract(트렁케이트 600) + key_finding when present', () => {
  const p = buildRxPrompt({ ...base, papers: [{ title: 'T', journal: 'JCEM', year: 2020, pop_group: 'east_asian', key_finding: '+4.5cm', abstract: 'A'.repeat(800) }] });
  assert.match(p, /\[1\] T \(JCEM 2020\)/);
  assert.match(p, /핵심: \+4\.5cm/);
  const m = p.match(/초록: (A+)/);
  assert.ok(m && m[1].length === 600);
});

test('buildRxPrompt falls back to one-line when no abstract/key_finding', () => {
  const p = buildRxPrompt({ ...base, papers: [{ title: 'T2', journal: 'J', year: 2019 }] });
  assert.match(p, /\[1\] T2 \(J 2019\)/);
  assert.ok(!p.includes('핵심:') && !p.includes('초록:'));
});

test('buildRxPrompt: no papers → 관련 논문 없음', () => {
  assert.match(buildRxPrompt({ ...base, papers: [] }), /관련 논문 없음/);
});

const bp = { profile: '11세 여아', labText: '검사', cohortMeds: ['성장호르몬'] };

test('buildRxPrompt injects 원장 저서 section when bookPassages present', () => {
  const p = buildRxPrompt({ ...bp, papers: [], bookPassages: [{ chapter: '3장｜성조숙증', content: '원장 방침 발췌입니다.' }] });
  assert.match(p, /## 원장님의 진료 철학·방침/);
  assert.match(p, /1차 기준/);
  assert.match(p, /3장｜성조숙증/);
  assert.match(p, /원장 방침 발췌입니다/);
});

test('buildRxPrompt omits 저서 section when no bookPassages', () => {
  const p = buildRxPrompt({ ...bp, papers: [] });
  assert.ok(!p.includes('## 원장님의 진료 철학·방침'));
});

test('buildRxPrompt joins multiple bookPassages with blank line, in order', () => {
  const p = buildRxPrompt({ ...bp, papers: [], bookPassages: [
    { chapter: '1장｜A', content: '첫째 발췌' },
    { chapter: '2장｜B', content: '둘째 발췌' },
  ] });
  assert.match(p, /\[1장｜A\] 첫째 발췌\n\n\[2장｜B\] 둘째 발췌/);
});
