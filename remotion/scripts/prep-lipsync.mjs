// 릴스 립싱크 입력 준비 — presenter-base.mp4 에서 **랜덤 구간**을 잘라 footage + 언어 음성 concat → LatentSync/input/.
//   node scripts/prep-lipsync.mjs <slug> <lang>
// 랜덤 오프셋(slug+lang 시드)으로 매 릴스 원장 컷이 달라 보임. 인퍼런스는 별도 실행(스크립트가 커맨드 출력).
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LS = "C:/Users/101024/lipsync/LatentSync";
const slug = process.argv[2], lang = process.argv[3];
if (!slug || !lang) { console.error("usage: node scripts/prep-lipsync.mjs <slug> <lang>"); process.exit(1); }
mkdirSync(join(LS, "input"), { recursive: true });

const timing = JSON.parse(readFileSync(join(ROOT, "src", "shorts", slug, `timing-${lang}.json`), "utf8"));
const ids = timing.map((t) => t.id);
const audioDir = join(ROOT, "public", "audio", "shorts", slug, lang);

// 음성 concat (ffmpeg concat 필터 — execFileSync 가 한글 경로를 인자로 그대로 전달)
const fullWav = join(LS, "input", `${slug}_${lang}.wav`);
const inputs = ids.flatMap((id) => ["-i", join(audioDir, `${id}.wav`)]);
const fc = ids.map((_, i) => `[${i}:a]`).join("") + `concat=n=${ids.length}:v=0:a=1[a]`;
execFileSync("ffmpeg", ["-y", ...inputs, "-filter_complex", fc, "-map", "[a]", "-ar", "44100", "-ac", "1", fullWav], { stdio: "inherit" });

const dur = timing.reduce((n, t) => n + t.durFrames, 0) / 30;
const base = join(ROOT, "public", "mainclip", "presenter-base.mp4");
const baseDur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", base]).toString().trim());
const need = +(dur + 1).toFixed(1);
// ★ 오프셋 = 콘텐츠(slug) 시드 + **언어 무관 고정 span**(MAX_NEED) → 같은 콘텐츠 6언어가 동일 컷 시작, 콘텐츠별로만 다름.
//   (span 을 현재 언어 need 로 잡으면 언어마다 오프셋이 갈림 → 고정 MAX_NEED 사용.) arg4 로 오프셋 직접 지정 가능.
const MAX_NEED = 42;
const override = process.argv[4];
let offset;
if (override !== undefined) {
  offset = parseFloat(override);
} else {
  let seed = 0; for (const ch of slug) seed += ch.charCodeAt(0);
  const span = Math.max(1, Math.floor(baseDur - MAX_NEED));
  offset = +(((seed * 1.7) % span)).toFixed(1);
}
offset = Math.max(0, Math.min(offset, +(baseDur - need).toFixed(1)));
const footage = join(LS, "input", `${slug}_${lang}_footage.mp4`);
if (need > baseDur) {
  // 오디오가 베이스보다 김 → 베이스 루프로 채움 (이음점은 마지막 CTA 카드가 패널을 덮는 구간에 떨어짐)
  console.log(`  (need ${need}s > base ${baseDur}s → base loop)`);
  execFileSync("ffmpeg", ["-y", "-stream_loop", "-1", "-i", base,
    "-t", String(need), "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-r", "30", footage], { stdio: "inherit" });
} else {
  execFileSync("ffmpeg", ["-y", "-ss", String(offset), "-i", base,
    "-t", String(need), "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-r", "30", footage], { stdio: "inherit" });
}

console.log(`\n✓ footage(offset ${offset}s, ${need}s) + audio(${dur.toFixed(1)}s) → ${LS}/input/`);
console.log(`▶ inference:\n  cd "${LS}" && .venv/Scripts/python.exe -m scripts.inference --unet_config_path configs/unet/stage2.yaml --inference_ckpt_path checkpoints/latentsync_unet.pt --inference_steps 20 --guidance_scale 1.5 --enable_deepcache --video_path "input/${slug}_${lang}_footage.mp4" --audio_path "input/${slug}_${lang}.wav" --video_out_path "output/${slug}_${lang}.mp4"`);
