// Upsert a batch of hand-written stories into patient_stories.
// Input JSON shape:
//   [{ child_id, title, story }, ...]
// Marks the row as source='claude', model='claude-opus-4-7[1m]'.
//
// Usage:
//   node cases/insert_stories_from_json.mjs <path-to-json>

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const AI_ENV = resolve(ROOT, 'ai-server', '.env');

const env = {};
for (const line of readFileSync(AI_ENV, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const s = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Usage: node insert_stories_from_json.mjs <path-to-json>');
  process.exit(1);
}

const rows = JSON.parse(readFileSync(jsonPath, 'utf8'));
if (!Array.isArray(rows)) {
  console.error('Expected an array in input JSON');
  process.exit(1);
}

const MODEL = 'claude-opus-4-7[1m]';
const now = new Date().toISOString();

let ok = 0, err = 0;
for (const r of rows) {
  if (!r.child_id || !r.title || !r.story) {
    console.error('  × missing field in row:', JSON.stringify(r).slice(0, 120));
    err += 1;
    continue;
  }
  const { error } = await s
    .from('patient_stories')
    .upsert(
      {
        child_id: r.child_id,
        title: r.title,
        story: r.story,
        model: MODEL,
        source: 'claude',
        generated_at: now,
        updated_at: now,
      },
      { onConflict: 'child_id' },
    );
  if (error) {
    console.error(`  × ${r.child_id}: ${error.message}`);
    err += 1;
  } else {
    ok += 1;
  }
}

console.log(`\nDone: ${ok} inserted, ${err} failed`);
