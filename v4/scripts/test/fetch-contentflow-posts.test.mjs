import { test } from 'node:test';
import assert from 'node:assert';
import { existsSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchAndCache } from '../lib/fetch-contentflow-posts.mjs';

test('fetchAndCache writes JSON per slug', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'i18n-test-'));
  const origFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ posts: [
      { slug: 'post-a', title: 'A', body_html: '<p>a</p>', cards: [], published_at: '2026-05-01' },
      { slug: 'post-b', title: 'B', body_html: '<p>b</p>', cards: [], published_at: '2026-05-02' },
    ]}),
  });

  const slugs = await fetchAndCache({
    apiUrl: 'http://mock', projectId: 'mock-id', lang: 'ko', cacheDir,
  });

  global.fetch = origFetch;
  assert.deepEqual(slugs.sort(), ['post-a', 'post-b']);
  assert.ok(existsSync(join(cacheDir, 'ko', 'post-a.json')));
  assert.ok(existsSync(join(cacheDir, 'ko', 'post-b.json')));
  rmSync(cacheDir, { recursive: true });
});

test('fetchAndCache returns empty when API returns no posts', async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), 'i18n-test-'));
  const origFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ posts: [] }) });
  const slugs = await fetchAndCache({
    apiUrl: 'http://mock', projectId: 'x', lang: 'ko', cacheDir,
  });
  global.fetch = origFetch;
  assert.deepEqual(slugs, []);
  rmSync(cacheDir, { recursive: true });
});
