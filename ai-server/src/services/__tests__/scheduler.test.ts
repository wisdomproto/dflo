import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectDue } from '../scheduler.js';

const now = '2026-06-06T12:00:00.000Z';

test('과거/현재 scheduled만 due, 미래·null·비scheduled 제외', () => {
  const items = [
    { id: 'a', status: 'scheduled', scheduled_at: '2026-06-06T11:00:00.000Z' },
    { id: 'b', status: 'scheduled', scheduled_at: '2026-06-06T13:00:00.000Z' },
    { id: 'c', status: 'scheduled', scheduled_at: null },
    { id: 'd', status: 'draft', scheduled_at: '2026-06-06T11:00:00.000Z' },
    { id: 'e', status: 'scheduled', scheduled_at: '2026-06-06T12:00:00.000Z' },
  ];
  assert.deepEqual(selectDue(items, now).map((x) => x.id), ['a', 'e']);
});

test('빈 배열', () => {
  assert.deepEqual(selectDue([], now), []);
});
