// 치료사례 후보 페이지(case-candidates.html)의 원장 스토리 편집·저장 — 로컬 cases/case_stories.json 갱신.
// case-candidates 는 PHI 포함 로컬 내부 도구라 dev(localhost)에서만 사용. PIN(x-admin-pin) 보호.
import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const caseStoryRouter = Router();
// src/routes → src → ai-server → <root> → cases/case_stories.json
const STORIES_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'cases', 'case_stories.json');
const PIN = process.env.WEBSITE_ADMIN_PIN || '8054';

type Story = { title: string; story: string };
function load(): Record<string, Story> {
  try { if (existsSync(STORIES_PATH)) return JSON.parse(readFileSync(STORIES_PATH, 'utf8')); } catch { /* ignore */ }
  return {};
}

// 단건 조회 (편집 폼 초기값 — 페이지에 이미 있지만 최신값 확인용)
caseStoryRouter.get('/:chart', (req, res) => {
  const obj = load();
  res.json(obj[String(req.params.chart)] ?? null);
});

// 저장 — chart 단위 read-merge-write
caseStoryRouter.post('/', (req, res) => {
  if ((req.headers['x-admin-pin'] || '') !== PIN) return res.status(401).json({ error: 'unauthorized' });
  const { chart, title, story } = (req.body ?? {}) as { chart?: string; title?: string; story?: string };
  if (!chart) return res.status(400).json({ error: 'chart required' });
  const obj = load();
  obj[String(chart)] = { title: String(title ?? ''), story: String(story ?? '') };
  try {
    writeFileSync(STORIES_PATH, JSON.stringify(obj, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
