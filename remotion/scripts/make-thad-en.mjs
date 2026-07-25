// 태국 광고영상 영어판 — 나레이션 TTS + 길이 검증.
//   node scripts/make-thad-en.mjs --tts     # TTS 생성 후 구간 적합성 리포트
//   node scripts/make-thad-en.mjs --mix     # BGM(보컬 제거) + 나레이션 믹스
// 원본: Downloads/태국 광고영상_{태국어 나레이션|자막X한국어 나레이션} ver.mp4 (28.72s, 1920x1080 안에 세로 608x1080)
// 원본 나레이션은 2줄뿐(0.0~1.8, 22.1~27.1)이라 가운데 20초가 비어 있어 그 구간에 줄을 더 넣는다.
import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(join(ROOT, ".env")); } catch {}
const KEY = process.env.GEMINI_API_KEY;
const VOICE = process.env.GEMINI_TTS_VOICE || "Charon";
const MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";

const AUDIO = join(ROOT, "public", "audio", "ads", "thad-en");
const WORK = join(ROOT, "out", "_work", "thad-en");
mkdirSync(AUDIO, { recursive: true });
mkdirSync(WORK, { recursive: true });

// at = 시작 시각(초), slot = 다음 줄까지 쓸 수 있는 여유(초). 화면 전환 기준.
export const LINES = [
  { id: "n1", at: 0.30, slot: 3.0, text: "Worried about your child's height?" },
  { id: "n2", at: 3.60, slot: 2.5, text: "A growth clinic in Gangnam, South Korea." },
  { id: "n3", at: 6.20, slot: 4.6, text: "Parents tell us what changed once growth was properly tracked." },
  { id: "n4", at: 11.20, slot: 3.4, text: "More reviews than we can fit here, from parents across Asia." },
  { id: "n5", at: 14.90, slot: 3.1, text: "Fifteen years of child growth and hormone care." },
  { id: "n6", at: 18.95, slot: 4.1, text: "Medical, sleep, nutrition, posture, exercise, managed together." },
  // 원본 2번째 줄 — "아시아 최고"는 유지, "태국에서"만 제외(사용자 지시).
  { id: "n7", at: 23.20, slot: 5.3, text: "Now you can receive Asia's best growth treatment." },
];

function pcmToWav(pcm, rate) {
  const bytes = pcm.length, h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + bytes, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(bytes, 40);
  return Buffer.concat([h, pcm]);
}

async function tts(text, outWav) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
  });
  let inline;
  for (let a = 1; a <= 4; a++) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    if (res.ok) {
      const j = await res.json();
      inline = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      if (inline?.data) break;
      throw new Error("응답에 오디오 없음");
    }
    if ((res.status === 429 || res.status === 503) && a < 4) { await new Promise((r) => setTimeout(r, 1500 * a)); continue; }
    throw new Error(`tts ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
  const rate = +(/rate=(\d+)/.exec(inline.mimeType || "")?.[1] || 24000);
  const raw = outWav + ".raw.wav";
  writeFileSync(raw, pcmToWav(Buffer.from(inline.data, "base64"), rate));
  // 앞뒤 무음 트림 + 라우드니스 정규화 — 배치 타이밍이 정확해진다
  execFileSync("ffmpeg", ["-y", "-i", raw, "-af",
    "silenceremove=start_periods=1:start_silence=0.06:start_threshold=-40dB:detection=peak,areverse,silenceremove=start_periods=1:start_silence=0.06:start_threshold=-40dB:detection=peak,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
    "-ar", "44100", "-ac", "1", outWav], { stdio: "ignore" });
  rmSync(raw, { force: true });
}

const dur = (f) => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim();

if (process.argv.includes("--tts")) {
  if (!KEY) { console.error("GEMINI_API_KEY 필요"); process.exit(1); }
  for (const l of LINES) {
    process.stdout.write(`${l.id} … `);
    await tts(l.text, join(AUDIO, `${l.id}.wav`));
    const f0 = join(AUDIO, `${l.id}.wav`);
    let d = dur(f0);
    // TTS 는 쉼표·마침표마다 쉬어 길이가 들쭉날쭉하다. 슬롯을 넘치면 배속으로 맞춘다
    // (1.25배까지만 — 그 이상은 부자연스럽다).
    if (d > l.slot) {
      const tempo = Math.min(1.25, d / l.slot);
      const tmp = f0 + ".t.wav";
      execFileSync("ffmpeg", ["-y", "-i", f0, "-filter:a", `atempo=${tempo.toFixed(3)}`, "-ar", "44100", "-ac", "1", tmp], { stdio: "ignore" });
      execFileSync("ffmpeg", ["-y", "-i", tmp, "-c", "copy", f0], { stdio: "ignore" });
      rmSync(tmp, { force: true });
      const nd = dur(f0);
      console.log(`${d.toFixed(2)}s → ${tempo.toFixed(2)}x → ${nd.toFixed(2)}s / 슬롯 ${l.slot}s`);
      d = nd;
    } else {
      console.log(`${d.toFixed(2)}s / 슬롯 ${l.slot}s OK`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("\n출력:", AUDIO);
}

// ── 믹스: BGM(보컬 제거) + 영어 나레이션 ──────────────────────────────
// TTS 길이가 실행마다 달라 고정 시각으로는 겹친다 → 실측 길이로 배치를 계산하고
// 앞줄이 밀리면 뒷줄을 그만큼 미룬다(MINGAP 확보).
if (process.argv.includes("--mix")) {
  const BGM = join(ROOT, "out", "_work", "thad-en", "bgm.wav");
  const OUT = join(ROOT, "out", "_work", "thad-en", "mix.wav");
  const TOTAL = 28.72, MINGAP = 0.18;

  let t = 0;
  const placed = LINES.map((l) => {
    const f = join(AUDIO, `${l.id}.wav`);
    const d = dur(f);
    const at = Math.max(l.at, t);
    t = at + d + MINGAP;
    return { ...l, f, d, at };
  });
  const over = placed.filter((p) => p.at + p.d > TOTAL);
  if (over.length) { console.error("영상 길이 초과:", over.map((o) => o.id).join(",")); process.exit(1); }

  const inputs = [], filters = [];
  inputs.push("-i", BGM);
  placed.forEach((p, i) => {
    inputs.push("-i", p.f);
    filters.push(`[${i + 1}:a]adelay=${Math.round(p.at * 1000)}|${Math.round(p.at * 1000)},apad[v${i}]`);
  });
  const voiceMix = placed.map((_, i) => `[v${i}]`).join("") + `amix=inputs=${placed.length}:normalize=0[voice]`;
  filters.push(voiceMix);
  // 나레이션이 나올 때 BGM 을 눌러(사이드체인) 말이 묻히지 않게 한다
  // ★[voice] 를 사이드체인과 최종 믹스 두 곳에서 쓰려면 asplit 으로 갈라야 한다.
  //   그냥 두 번 참조하면 한쪽만 연결되고 나레이션이 통째로 사라진다(에러도 안 난다).
  filters.push(`[voice]asplit=2[vsc][vmix]`);
  filters.push(`[0:a]volume=0.85[bg]`);
  filters.push(`[bg][vsc]sidechaincompress=threshold=0.05:ratio=8:attack=8:release=320[duck]`);
  filters.push(`[duck][vmix]amix=inputs=2:normalize=0,atrim=0:${TOTAL},loudnorm=I=-15:TP=-1.5:LRA=11[out]`);

  execFileSync("ffmpeg", ["-y", ...inputs, "-filter_complex", filters.join(";"), "-map", "[out]",
    "-ar", "44100", "-ac", "2", OUT], { stdio: "inherit" });
  // ★자막은 여기서 계산된 실제 배치를 그대로 써야 한다. 컴포넌트에 시각을 손으로 적으면
  //   TTS 길이가 바뀔 때마다 소리와 자막이 어긋난다.
  writeFileSync(join(ROOT, "src", "ads", "thadEnNarration.json"),
    JSON.stringify(placed.map((p) => ({ id: p.id, at: +p.at.toFixed(2), end: +(p.at + p.d).toFixed(2), text: p.text })), null, 1));

  console.log("\n믹스 →", OUT);
  placed.forEach((p) => console.log(`  ${p.id}  ${p.at.toFixed(2)} ~ ${(p.at + p.d).toFixed(2)}  ${p.text}`));
}
