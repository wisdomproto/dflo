import { test } from 'node:test';
import assert from 'node:assert';
import { snapFrac, nudgeLabel, labelPos, setLabelPos } from '../../src/features/marketing/utils/reelEditor.ts';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test('snapFrac: 0.01 격자 반올림', () => {
  close(snapFrac(0.064), 0.06);
  close(snapFrac(0.066), 0.07);
  close(snapFrac(0.5), 0.5);
});
test('snapFrac: 0..1 clamp', () => {
  close(snapFrac(-0.3), 0);
  close(snapFrac(1.4), 1);
});
test('labelPos: pos 미설정 → base x/y (전 언어 공통 시드)', () => {
  const l = { x: 0.4, y: 0.6, ko: 'a' };
  const ko = labelPos(l, 'ko'), th = labelPos(l, 'th');
  close(ko.x, 0.4); close(ko.y, 0.6);
  close(th.x, 0.4); close(th.y, 0.6); // 둘 다 base 폴백 → 동일
});
test('labelPos: pos[lang] 오버라이드 우선', () => {
  const l = { x: 0.4, y: 0.6, pos: { th: { x: 0.7, y: 0.2 } } };
  const th = labelPos(l, 'th'), ko = labelPos(l, 'ko');
  close(th.x, 0.7); close(th.y, 0.2); // th 만 오버라이드
  close(ko.x, 0.4); close(ko.y, 0.6); // ko 는 여전히 base
});
test('setLabelPos: 해당 언어만 기록 — base·타 언어 불변(연동 차단)', () => {
  const l = { x: 0.4, y: 0.6, ko: 'a', th: 'b' };
  const r = setLabelPos(l, 'th', 0.8, 0.1);
  close(r.pos.th.x, 0.8); close(r.pos.th.y, 0.1);
  close(r.x, 0.4); close(r.y, 0.6);        // base 보존
  assert.equal(r.pos.ko, undefined);        // ko 위치는 안 생김 → labelPos(ko)=base
  assert.equal(r.ko, 'a'); assert.equal(r.th, 'b'); // 텍스트 보존
  // 원본 불변
  assert.equal(l.pos, undefined);
});
test('setLabelPos: 기존 pos 병합 (타 언어 오버라이드 유지)', () => {
  const l = { x: 0.5, y: 0.5, pos: { ko: { x: 0.1, y: 0.1 } } };
  const r = setLabelPos(l, 'th', 0.9, 0.9);
  close(r.pos.ko.x, 0.1); close(r.pos.th.x, 0.9); // 둘 다 존재
});
test('setLabelPos: 0..1 clamp', () => {
  const r = setLabelPos({ x: 0.5, y: 0.5 }, 'en', 1.4, -0.3);
  close(r.pos.en.x, 1); close(r.pos.en.y, 0);
});
test('nudgeLabel: step(1%) 이동 → pos[lang] 기록 + 기타 필드 보존', () => {
  const r = nudgeLabel({ x: 0.5, y: 0.5, ko: 'a' }, 'th', 1, 0);
  close(r.pos.th.x, 0.51); close(r.pos.th.y, 0.5); assert.equal(r.ko, 'a');
  const u = nudgeLabel({ x: 0.5, y: 0.5 }, 'th', 0, -1);
  close(u.pos.th.y, 0.49);
});
test('nudgeLabel: 기존 pos[lang]에서 이어 이동 (base 아님)', () => {
  const l = { x: 0.5, y: 0.5, pos: { th: { x: 0.2, y: 0.2 } } };
  const r = nudgeLabel(l, 'th', 1, 1);
  close(r.pos.th.x, 0.21); close(r.pos.th.y, 0.21); // 0.2 기준 이동
});
test('nudgeLabel: 모서리에서 정지(clamp)', () => {
  const r = nudgeLabel({ x: 0.5, y: 0.5, pos: { th: { x: 0.995, y: 0.005 } } }, 'th', 1, -1);
  close(r.pos.th.x, 1); close(r.pos.th.y, 0);
});
