import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function fetchAndCache({ apiUrl, projectId, lang, cacheDir }) {
  const url = `${apiUrl}/api/blog/by-project/${projectId}/posts?lang=${lang}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ContentFlow fetch ${url} failed: ${res.status}`);
  }
  const { posts = [] } = await res.json();

  const dir = join(cacheDir, lang);
  mkdirSync(dir, { recursive: true });

  const slugs = [];
  for (const post of posts) {
    if (!post.slug) continue;
    writeFileSync(join(dir, `${post.slug}.json`), JSON.stringify(post, null, 2));
    slugs.push(post.slug);
  }
  return slugs;
}

export async function fetchAllLangs({ apiUrl, projectId, langs, cacheDir }) {
  const result = {};
  for (const lang of langs) {
    try {
      result[lang] = await fetchAndCache({ apiUrl, projectId, lang, cacheDir });
      console.log(`  [blog] cached ${result[lang].length} posts for ${lang}`);
    } catch (e) {
      console.warn(`  [blog] fetch failed for ${lang}: ${e.message}`);
      result[lang] = [];
    }
  }
  return result;
}
