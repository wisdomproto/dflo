// 원본 대본 싱크 (ko/th) — 원장님 클론으로 6청크 생성, 원본 슬롯에 맞춰 정렬(길면 가속).
// 출력: public/audio/supp-sync/<locale>/cN.wav + manifest
//   $env:ELEVEN_API_KEY=..; $env:ELEVEN_VOICE_ID=W2h6uMT837yzrawb0X2r; node scripts/gen-tts-sync.mjs th
import { writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
try { process.loadEnvFile(join(ROOT, ".env")); } catch {} // remotion/.env 자동 로드(없으면 셸 env 사용)
const API_KEY = process.env.ELEVEN_API_KEY;
const VOICE_ID = process.env.ELEVEN_VOICE_ID;
const FPS = 30;
const locale = ["ko", "en", "th"].includes(process.argv[2]) ? process.argv[2] : "th";
const MODEL = process.env.ELEVEN_MODEL || (locale === "th" ? "eleven_turbo_v2_5" : "eleven_multilingual_v2");
const OUT_DIR = join(ROOT, "public", "audio", "supp-sync", locale);

// start/end = 초 (원본 전사 타임스탬프). 텍스트는 원본 대본(ko) / 충실 번역(th).
const CHUNKS = [
  { id: "c1", start: 0.0, end: 8.0,
    ko: "성장 영양제 검색하면 나오는 내용은 칼슘 뿐인데요. 칼슘만 먹으면 우리 아이도 백칠십, 백팔십삼? 아닙니다.",
    th: "ค้นหาอาหารเสริมเพิ่มความสูง ก็เจอแต่แคลเซียม กินแคลเซียมอย่างเดียว ลูกเราจะสูงร้อยเจ็ดสิบ ร้อยแปดสิบสามเลยเหรอ ไม่ใช่เลยครับ",
    en: "Search for height supplements, and all you find is calcium. But will calcium alone make your child grow to 170, even 183 centimeters? Nope." },
  { id: "c2", start: 8.0, end: 14.0,
    ko: "키가 잘 자라기 위해서는 호르몬, 수면, 영양 이 세 가지 균형이 중요합니다.",
    th: "การที่ลูกจะสูงได้ดี ต้องสมดุลสามอย่าง ฮอร์โมน การนอน และโภชนาการ",
    en: "To grow tall, three things have to stay in balance: hormones, sleep, and nutrition." },
  { id: "c3", start: 14.0, end: 20.0,
    ko: "첫째, 아르기닌. 성장 호르몬의 분비를 도와 키 성장에 도움을 줍니다.",
    th: "อย่างแรก อาร์จินีน ช่วยกระตุ้นการหลั่งโกรทฮอร์โมน ช่วยให้สูงขึ้น",
    en: "First, arginine. It boosts the release of growth hormone and helps your child grow taller." },
  { id: "c4", start: 20.0, end: 32.0,
    ko: "둘째, 마그네슘. 잘 자야 키가 크겠죠? 수면을 도와주는 마그네슘은 근육의 이완을 돕고 마음을 편안하게 하여 우리 아이의 수면을 도와줍니다.",
    th: "อย่างที่สอง แมกนีเซียม นอนหลับดีถึงจะสูงใช่ไหมครับ แมกนีเซียมช่วยให้กล้ามเนื้อผ่อนคลาย จิตใจสงบ และช่วยให้ลูกนอนหลับสบาย",
    en: "Second, magnesium. Good sleep means better growth, right? Magnesium relaxes the muscles and calms the mind, so your child sleeps soundly." },
  { id: "c5", start: 32.0, end: 49.0,
    ko: "셋째, 아연. 이렇게 많은 영양제 안에 공통적으로 들어 있는 성분은 바로 아연입니다. 성장 그리고 면역을 유지하는 데 아주 중요한 성분인데요. 부족하게 되면 성장이 늘어질 수가 있습니다. 세포들을 잘 자라게 하고 면역력을 높여 줍니다.",
    th: "อย่างที่สาม สังกะสี เป็นส่วนผสมที่อยู่ในอาหารเสริมหลายชนิด สำคัญมากต่อการเจริญเติบโตและภูมิคุ้มกัน ถ้าขาดไป การเจริญเติบโตอาจช้าลง ช่วยให้เซลล์เติบโตดีและเสริมภูมิคุ้มกัน",
    en: "Third, zinc. It's the one ingredient found in almost every supplement. Zinc is vital for growth and immunity, and a shortage can slow growth down. It helps cells grow well and strengthens immunity." },
  { id: "c6", start: 49.0, end: 56.6,
    ko: "칼슘과 함께 영양제 속 아르기닌, 마그네슘, 아연 이 세 가지 성분이 있는지 꼭 확인해 주세요.",
    th: "ลองดูให้ดีว่าในอาหารเสริม มีอาร์จินีน แมกนีเซียม และสังกะสี ครบพร้อมแคลเซียมหรือไม่",
    en: "Along with calcium, make sure your supplement has all three: arginine, magnesium, and zinc." },
];

if (!API_KEY || !VOICE_ID) { console.error("❌ ELEVEN_API_KEY + ELEVEN_VOICE_ID 필요"); process.exit(1); }
const wavDur = (p) => (readFileSync(p).length - 44) / (44100 * 2);

async function tts(text, outRaw) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
  const res = await fetch(url, { method: "POST", headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: +(process.env.STABILITY ?? 0.8), similarity_boost: +(process.env.SIMILARITY ?? 0.8), style: +(process.env.STYLE ?? 0), use_speaker_boost: true } }) });
  if (!res.ok) throw new Error(`tts ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const tmp = outRaw + ".mp3";
  writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  // loudnorm: 클립 간 음량 일정하게 (마지막 청크 작아지는 문제 해결)
  execFileSync("ffmpeg", ["-y", "-i", tmp, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", outRaw], { stdio: "ignore" });
  rmSync(tmp, { force: true });
}
function fitToSlot(raw, out, targetSec) {
  const nat = wavDur(raw);
  if (process.env.NO_FIT) { execFileSync("ffmpeg", ["-y", "-i", raw, out], { stdio: "ignore" }); return { nat, factor: 1 }; }
  const factor = Math.max(1, nat / targetSec);
  if (factor <= 1.001) { execFileSync("ffmpeg", ["-y", "-i", raw, out], { stdio: "ignore" }); return { nat, factor: 1 }; }
  const tempos = []; let f = factor; while (f > 2) { tempos.push(2); f /= 2; } tempos.push(f);
  execFileSync("ffmpeg", ["-y", "-i", raw, "-filter:a", tempos.map((t) => `atempo=${t.toFixed(4)}`).join(","), out], { stdio: "ignore" });
  return { nat, factor };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`🎙️  sync ${locale} voice=${VOICE_ID} model=${MODEL}`);
  const manifest = [];
  for (const c of CHUNKS) {
    process.stdout.write(`  ${c.id} (slot ${(c.end - c.start).toFixed(1)}s) … `);
    const raw = join(OUT_DIR, `${c.id}.raw.wav`), out = join(OUT_DIR, `${c.id}.wav`);
    try {
      await tts(c[locale], raw);
      const { nat, factor } = fitToSlot(raw, out, c.end - c.start);
      rmSync(raw, { force: true });
      const dur = wavDur(out);
      manifest.push({ id: c.id, durFrames: Math.round(dur * FPS), origStartF: Math.round(c.start * FPS), rate: +((c.end - c.start) / dur).toFixed(3), natSec: +nat.toFixed(2) });
      console.log(`ok (nat ${nat.toFixed(1)}s → ${dur.toFixed(1)}s, x${factor.toFixed(2)})`);
    } catch (e) { console.log("FAIL"); console.error(e.message); process.exitCode = 1; }
    await new Promise((r) => setTimeout(r, 300));
  }
  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify({ locale, fps: FPS, chunks: manifest }, null, 2));
  // 컴포지션이 import 하는 타이밍 JSON (재생성마다 자동 반영)
  const SRC_DATA = join(ROOT, "src", "data");
  mkdirSync(SRC_DATA, { recursive: true });
  writeFileSync(join(SRC_DATA, `supp-sync-${locale}.json`), JSON.stringify(manifest, null, 2));
  console.log(`\n📁 ${OUT_DIR}\n📄`, JSON.stringify(manifest));
}
main();
