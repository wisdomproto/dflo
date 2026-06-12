import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPushDoc, toLocalScriptJson, ACTIVE_STATUSES, isStale } from "./reelWorkerLib.mjs";

test("buildPushDoc: insert 로컬 경로 → reel_assets URL 치환 + script 서브트리 구성", () => {
  const local = { slug: "성장판나이", fps: 30, title: "t", header: {}, chunks: [{ id: "c3", insert: "images/성장판나이/ig1.png" }] };
  const doc = buildPushDoc(local, { infographics: { ig1: "https://r2/x/ig1.png" } });
  assert.equal(doc.slug, "성장판나이");
  assert.equal(doc.script.chunks[0].insert, "https://r2/x/ig1.png");
  assert.equal(doc.script.title, "t");          // 미편집 필드 보존
  assert.equal(doc.script.fps, undefined);      // fps/slug 는 루트 메타 — script 서브트리 제외
});
test("buildPushDoc: 매칭 실패는 에러(절반 등록 금지)", () => {
  const local = { slug: "s", fps: 30, chunks: [{ id: "c1", insert: "images/s/ig9.png" }] };
  assert.throws(() => buildPushDoc(local, { infographics: {} }), /ig9/);
});
test("buildPushDoc: 이미 URL 인 insert 는 그대로", () => {
  const local = { slug: "s", fps: 30, chunks: [{ id: "c1", insert: "https://r2/a.png" }] };
  assert.equal(buildPushDoc(local, {}).script.chunks[0].insert, "https://r2/a.png");
});
test("toLocalScriptJson: 라운드트립 (DB doc → 기존 script.json 평탄 구조)", () => {
  const doc = { slug: "s", script: { title: "t", header: {}, chunks: [] } };
  assert.deepEqual(toLocalScriptJson(doc), { slug: "s", fps: 30, title: "t", header: {}, chunks: [] });
});
test("isStale: updated_at 10분 초과 active 만 true, queued 는 제외", () => {
  const old = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  assert.equal(isStale({ status: "render", updated_at: old }, Date.now()), true);
  assert.equal(isStale({ status: "queued", updated_at: old }, Date.now()), false);
  assert.equal(isStale({ status: "render", updated_at: new Date().toISOString() }, Date.now()), false);
  assert.equal(ACTIVE_STATUSES.includes("upload_preview"), true);
});
