// R2 website.json 업로드 헬퍼 (ai-server PUT /api/r2/website 경유)
// 사용법: node cases/r2_upload_website.mjs <json파일> [key]
//   <json파일>: 업로드할 sections 배열 JSON (예: website_to_upload.json)
//   [key]     : 'website.json'(기본) | 'app-home.json'
// 환경변수: AI_SERVER_URL(기본 http://localhost:3001), WEBSITE_ADMIN_PIN(기본 8054)
//
// 이 스크립트는 .claude/settings.local.json 의 allow 룰로 자동 허용됨
// (production R2 공유 리소스 쓰기 — 의도된 정상 워크플로우).
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const key = process.argv[3] || 'website.json';
if (!file) {
  console.error('usage: node cases/r2_upload_website.mjs <json file> [key]');
  process.exit(1);
}

const BASE = (process.env.AI_SERVER_URL || 'http://localhost:3001').replace(/\/$/, '');
const PIN = process.env.WEBSITE_ADMIN_PIN || '8054';

const raw = readFileSync(file, 'utf-8');
// JSON 유효성 + 직렬화 정규화
const parsed = JSON.parse(raw);

const res = await fetch(`${BASE}/api/r2/website?key=${encodeURIComponent(key)}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', 'x-admin-pin': PIN },
  body: JSON.stringify(parsed),
});
const text = await res.text();
console.log('status:', res.status);
console.log(text);
if (!res.ok) process.exit(1);
