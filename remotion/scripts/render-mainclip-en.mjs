// MainClipEN 렌더 — 이 머신은 renderMedia 가 "성공했다는데 파일이 안 써지는" 버그가 있어
// (remotion_render_workaround) renderFrames 로 시퀀스를 뽑고 ffmpeg 로 직접 합친다.
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, rmSync } from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)));
const R = "C:/projects/dflo_0.1/remotion";
const OUTDIR = join(R, "out/_work/mainclip-en-frames");
rmSync(OUTDIR, { recursive: true, force: true });
mkdirSync(OUTDIR, { recursive: true });

console.log("번들 중…");
const serveUrl = await bundle({ entryPoint: join(R, "src/index.ts") });
const comp = await selectComposition({ serveUrl, id: "MainClipEN", inputProps: {} });
console.log(`컴포지션: ${comp.durationInFrames}f @ ${comp.fps}fps ${comp.width}x${comp.height}`);

let last = 0;
await renderFrames({
  serveUrl, composition: comp, inputProps: {},
  outputDir: OUTDIR,
  imageFormat: "jpeg", jpegQuality: 92,
  concurrency: 4,
  onStart: () => console.log("프레임 렌더 시작"),
  onFrameUpdate: (f) => {
    const pct = Math.floor((f / comp.durationInFrames) * 100);
    if (pct >= last + 10) { last = pct; console.log(`  ${pct}% (${f}/${comp.durationInFrames})`); }
  },
});
console.log("프레임 완료 →", OUTDIR);
