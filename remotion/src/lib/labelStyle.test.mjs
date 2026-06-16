import { test } from "node:test";
import assert from "node:assert/strict";
import { labelBoxStyle } from "./labelStyle.mjs";

test("폰트맵: 기본 kr, 키별 분기", () => {
  assert.match(labelBoxStyle({}).fontFamily, /Noto Sans KR/);
  assert.match(labelBoxStyle({ font: "inter" }).fontFamily, /Inter/);
  assert.match(labelBoxStyle({ font: "sc" }).fontFamily, /Noto Sans SC/);
  assert.match(labelBoxStyle({ font: "tc" }).fontFamily, /Noto Sans TC/);
});
test("그림자 기본값: pill 없으면 on, pill 있으면 off, 명시 우선", () => {
  assert.notEqual(labelBoxStyle({}).textShadow, "none");
  assert.equal(labelBoxStyle({ pill: "#fff" }).textShadow, "none");
  assert.equal(labelBoxStyle({ shadow: false }).textShadow, "none");
  assert.notEqual(labelBoxStyle({ pill: "#fff", shadow: true }).textShadow, "none");
});
test("외각: stroke 있으면 WebkitTextStroke+paintOrder, 없으면 미포함", () => {
  const s = labelBoxStyle({ stroke: "#000" });
  assert.equal(s.WebkitTextStroke, "2px #000");
  assert.equal(s.paintOrder, "stroke fill");
  assert.equal(labelBoxStyle({}).WebkitTextStroke, undefined);
});
test("pill: 배경/패딩, 없으면 배경 미포함", () => {
  assert.equal(labelBoxStyle({ pill: "#E0568A" }).background, "#E0568A");
  assert.equal(labelBoxStyle({}).background, undefined);
});
test("size/weight/color 기본값", () => {
  const d = labelBoxStyle({});
  assert.equal(d.fontSize, 40);
  assert.equal(d.fontWeight, 800);
  assert.equal(d.color, "#1f2430");
});
