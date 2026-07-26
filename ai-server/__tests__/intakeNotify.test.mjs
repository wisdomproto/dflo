import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeIntake, ageFrom } from '../dist/services/intakeNotify.js';

const NOW = new Date('2026-07-26T10:00:00+09:00');

test('ageFrom: 생일 전후 + 이상한 값', () => {
  assert.equal(ageFrom('2014-07-25', NOW), 12); // 생일 지남
  assert.equal(ageFrom('2014-07-27', NOW), 11); // 생일 전
  assert.equal(ageFrom(null, NOW), null);
  assert.equal(ageFrom('아무말', NOW), null);   // 파싱 실패해도 알림이 죽으면 안 된다
});

test('summarizeIntake: 채워진 설문', () => {
  const text = summarizeIntake({
    token: 't1', created_at: '2026-07-26T00:30:00Z', lang: 'th', country: 'TH',
    name: '홍길동', gender: 'male', birth_date: '2014-03-02', phone: '010-1234-5678',
    current_height: 142.5, father_height: 175, mother_height: 160, desired_height: 180,
    uploads: [{ kind: 'xray' }, { kind: 'lab' }, { kind: 'lab' }],
  }, NOW);
  assert.match(text, /홍길동 \(남 · 만 12세\)/);
  assert.match(text, /th \/ TH/);
  assert.match(text, /현재 키: 142\.5cm/);
  assert.match(text, /부 175 · 모 160cm/);
  assert.match(text, /희망 키: 180cm/);
  assert.match(text, /010-1234-5678/);
  assert.match(text, /엑스레이 1 · 검사지 2/);
  assert.match(text, /\/admin\/intake$/);
});

test('summarizeIntake: 빈 설문도 죽지 않는다', () => {
  const text = summarizeIntake({ token: 't2' }, NOW);
  assert.match(text, /\(이름 없음\)/);
  assert.match(text, /연락처: 미입력/);
  assert.doesNotMatch(text, /첨부/);       // 첨부 0건이면 줄 자체가 없다
  assert.doesNotMatch(text, /undefined|null|NaN/);
});

test('summarizeIntake: 한글 이름이 없으면 영문 이름', () => {
  assert.match(summarizeIntake({ token: 't3', name_en: 'Somchai' }, NOW), /Somchai/);
});
