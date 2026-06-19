import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStoryPrompt } from '../advisorStory.js';

test('buildStoryPrompt: includes track CTA, topic, and constraints', () => {
  const p = buildStoryPrompt({ reelId: 8, title: '성조숙증의 함정', track: 'homepage' });
  assert.match(p, /성조숙증의 함정/);
  assert.match(p, /예측키|측정/);          // homepage CTA
  assert.match(p, /ครับ|ผม/);              // 태국어 격식체 제약
  assert.match(p, /효과|보장|개인차/);      // 의료광고 규정
  assert.match(p, /태국어[\s\S]*한국어|한국어[\s\S]*태국어/);
});

test('buildStoryPrompt: engagement track uses profile CTA', () => {
  const p = buildStoryPrompt({ reelId: 1, title: '키 유전 80%', track: 'engagement' });
  assert.match(p, /프로필|더보기|팔로우/);
});
