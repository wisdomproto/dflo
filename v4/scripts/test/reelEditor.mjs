import { test } from 'node:test';
import assert from 'node:assert';
import { snapFrac, nudgeLabel } from '../../src/features/marketing/utils/reelEditor.ts';

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
test('nudgeLabel: step(1%) 이동 + 기타 필드 보존', () => {
  const r = nudgeLabel({ x: 0.5, y: 0.5, ko: 'a' }, 1, 0);
  close(r.x, 0.51); close(r.y, 0.5); assert.equal(r.ko, 'a');
  const u = nudgeLabel({ x: 0.5, y: 0.5 }, 0, -1);
  close(u.y, 0.49);
});
test('nudgeLabel: 모서리에서 정지(clamp)', () => {
  const r = nudgeLabel({ x: 0.995, y: 0.005 }, 1, -1);
  close(r.x, 1); close(r.y, 0);
});
