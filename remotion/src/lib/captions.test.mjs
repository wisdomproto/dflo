import { test } from "node:test";
import assert from "node:assert/strict";
import { splitIntoPhrases, distributeFrames, buildCaptions } from "./captions.mjs";

test("한국어: 공백 단어를 글자수 예산 내로 묶는다", () => {
  const p = splitIntoPhrases("에이디에이치디 약을 먹으면 키가 안 큰다 오늘 정리해 드리겠습니다", "ko", { maxChars: 12 });
  assert.ok(p.length >= 2);
  for (const ph of p) assert.equal(ph, ph.trim());
});

test("태국어: 구절-공백에서 끊고 단어 내부는 안 쪼갠다", () => {
  const p = splitIntoPhrases("ยา ADHD ทำให้ลูกตัวไม่สูง วันนี้เคลียร์ให้ชัด", "th", { maxChars: 14 });
  assert.ok(p.length >= 2);
  for (const ph of p) assert.equal(ph, ph.trim());
});

test("중국어(공백 없음): 글자수 예산으로 쪼갠다", () => {
  const p = splitIntoPhrases("吃ADHD药孩子就长不高今天讲清楚这点很重要", "cn", { maxChars: 6 });
  assert.ok(p.length >= 2);
  for (const ph of p) assert.ok(Array.from(ph).length <= 6);
});

test("distributeFrames: durFrames 합이 정확히 일치", () => {
  const segs = distributeFrames(["가나다", "라마바사", "아자"], 100);
  assert.equal(segs.reduce((a, s) => a + s.durFrames, 0), 100);
  assert.equal(segs[0].fromFrame, 0);
  assert.equal(segs[1].fromFrame, segs[0].durFrames);
});

test("단일 구절은 전체 길이를 차지", () => {
  assert.deepEqual(distributeFrames(["hello"], 60), [{ text: "hello", fromFrame: 0, durFrames: 60 }]);
});

test("빈 입력은 빈 배열", () => {
  assert.deepEqual(splitIntoPhrases("", "ko"), []);
  assert.deepEqual(distributeFrames([], 100), []);
});

test("buildCaptions: 청크별 구절 + durFrames 합 일치 + 빈 나레이션은 빈 배열", () => {
  const chunks = [
    { id: "c1", durFrames: 100, ko: "가나다 라마바 사아자 차카타 파하" },
    { id: "c2", durFrames: 60, ko: "" },
  ];
  const caps = buildCaptions(chunks, "ko");
  assert.deepEqual(Object.keys(caps), ["c1", "c2"]);
  assert.ok(caps.c1.length >= 1);
  assert.equal(caps.c1.reduce((a, p) => a + p.durFrames, 0), 100);
  assert.deepEqual(caps.c2, []);
});
