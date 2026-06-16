// @reel 컴포지션(PresenterShort)의 전이 폐쇄를 ../remotion/src → v4/reel-vendor 로 동기화.
//
// 왜: Railway 배포 빌드는 root dir=v4 라 ../remotion 이 빌드 컨텍스트에 없다 → @reel 이 stub 으로
// 폴백해 프리뷰 자리에 안내문구만 떴다. 실소스가 있는 로컬(dev/build)에서 이 스크립트가 vendor 를
// 최신화하고, 그 vendor 를 커밋해 두면 Railway 가 커밋본으로 실제 컴포지션을 번들 → 배포에서도 프리뷰 동작.
//
// 단일 소스 = ../remotion/src. reel-vendor 는 파생물(prebuild/predev 자동 동기화). 소스 부재(Railway)면 무동작.
// 폐쇄가 늘면 CLOSURE 에 추가 — 누락 시 아래 무결성 검사가 prebuild 에서 막는다(프로덕션 빌드 사전 보호).
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '..', '..', 'remotion', 'src');
const DEST = resolve(HERE, '..', 'reel-vendor');

// PresenterBridge 가 import 하는 @reel 진입점(shorts/_shared/PresenterShort · lib/assets)의 전이 폐쇄.
// 상대 import 만 — 패키지(remotion·@remotion/gif)는 v4 deps. 확인: 각 파일의 `from './..'` 추적.
const CLOSURE = [
  'shorts/_shared/PresenterShort.tsx',
  'shorts/_shared/ShortLogo.tsx',
  'shorts/_shared/StickerLayer.tsx',
  'lib/assets.ts',
  'lib/fonts.ts',
  'lib/captions.mjs',
  'lib/captions.d.mts',
];

if (!existsSync(SRC)) {
  console.log('[sync-reel-vendor] ../remotion/src 없음 — 커밋된 reel-vendor 사용 (Railway 빌드 컨텍스트).');
  process.exit(0);
}

let written = 0;
for (const rel of CLOSURE) {
  const from = join(SRC, rel);
  if (!existsSync(from)) throw new Error(`[sync-reel-vendor] 소스 파일 없음: ${rel} — CLOSURE 목록 점검.`);
  const to = join(DEST, rel);
  const next = readFileSync(from);
  const cur = existsSync(to) ? readFileSync(to) : null;
  if (!cur || !cur.equals(next)) {
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, next);
    written++;
  }
}

// 무결성: vendor 안 각 파일의 상대 import 가 vendor 안에 실제로 존재하는지 검사.
// PresenterShort 가 새 파일을 import 하기 시작하면(폐쇄 확장) 여기서 잡혀 prebuild 가 실패 →
// 미동기화된 vendor 가 그대로 커밋/배포돼 프로덕션 빌드만 깨지는 사고를 로컬에서 차단.
const EXTS = ['', '.ts', '.tsx', '.mjs', '.js', '.jsx', '/index.ts', '/index.tsx'];
const canResolve = (baseFile, spec) => {
  const base = join(dirname(baseFile), spec);
  return EXTS.some((e) => existsSync(base + e));
};
const missing = [];
const scan = (dir) => {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) { scan(p); continue; }
    if (!/\.(ts|tsx|mjs|js|jsx)$/.test(ent.name)) continue; // .d.mts 등 타입선언은 스킵
    const txt = readFileSync(p, 'utf8');
    const re = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g;
    let m;
    while ((m = re.exec(txt))) {
      if (!canResolve(p, m[1])) missing.push(`${p.slice(DEST.length + 1)} → ${m[1]}`);
    }
  }
};
scan(DEST);
if (missing.length) {
  throw new Error(
    '[sync-reel-vendor] vendor 폐쇄 누락 — 아래 import 대상이 reel-vendor 에 없습니다:\n  ' +
    missing.join('\n  ') +
    '\n→ scripts/sync-reel-vendor.mjs 의 CLOSURE 에 누락 파일을 추가하세요.',
  );
}

console.log(`[sync-reel-vendor] 동기화 완료 — ${CLOSURE.length}개 중 ${written}개 갱신.`);
