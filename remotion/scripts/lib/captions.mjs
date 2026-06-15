// 청크 나레이션 → 카라오케 자막 구절. 순수 함수(렌더러·CLI 공용).
// 한국어/태국어/영어/베트남어 = 공백 토큰화, 중국어(cn/ch) = 글자 토큰화.
const CJK = new Set(["cn", "ch"]);
const SENT_END = /[。！？!?．.…]$/;

function len(s) {
  return Array.from(s).length;
}

export function splitIntoPhrases(text, lang, opts = {}) {
  const maxChars = opts.maxChars ?? (CJK.has(lang) ? 12 : 20);
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const cjk = CJK.has(lang);
  const atoms = cjk ? Array.from(clean) : clean.split(" ");
  const sep = cjk ? "" : " ";
  const phrases = [];
  let cur = "";
  for (const a of atoms) {
    const cand = cur ? cur + sep + a : a;
    if (cur && len(cand) > maxChars) {
      phrases.push(cur);
      cur = a;
    } else {
      cur = cand;
    }
    if (SENT_END.test(a) && cur) {
      phrases.push(cur);
      cur = "";
    }
  }
  if (cur) phrases.push(cur);
  return phrases;
}

export function distributeFrames(phrases, durFrames) {
  if (!phrases.length) return [];
  const weights = phrases.map((p) => Math.max(1, len(p)));
  const total = weights.reduce((a, b) => a + b, 0);
  const out = [];
  let acc = 0;
  for (let i = 0; i < phrases.length; i++) {
    const d = i === phrases.length - 1
      ? durFrames - acc
      : Math.max(1, Math.floor((weights[i] / total) * durFrames));
    out.push({ text: phrases[i], fromFrame: acc, durFrames: Math.max(1, d) });
    acc += out[i].durFrames;
  }
  return out;
}
