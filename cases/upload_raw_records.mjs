// Upload 판독문 + 랩데이터 raw files to Supabase Storage ('raw-records' bucket)
// and record the resulting public URLs on children.intake_survey.raw_files.
//
//   node cases/upload_raw_records.mjs [--dry-run] [--kind pandokmun|lab]
//
// Layout in the bucket:
//   pandokmun/<chart_number>/<filename>
//   lab/<chart_number>/<filename>
//
// Per child we set intake_survey.raw_files = {
//   pandokmun: [{ path, filename, url }, ...],
//   lab:       [{ path, filename, url }, ...],
// }
// Existing intake_survey fields are preserved.

import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BUCKET = 'raw-records';

function loadEnv(p) {
  try {
    return Object.fromEntries(
      readFileSync(p, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]),
    );
  } catch {
    return {};
  }
}
const v4 = loadEnv(resolve(ROOT, 'v4', '.env.local'));
const ai = loadEnv(resolve(ROOT, 'ai-server', '.env'));
const supabase = createClient(
  v4.VITE_SUPABASE_URL || ai.SUPABASE_URL,
  ai.SUPABASE_SERVICE_ROLE_KEY || v4.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const kindArg = args.find((a, i) => args[i - 1] === '--kind');
const ONLY_KIND = kindArg && ['pandokmun', 'lab'].includes(kindArg) ? kindArg : null;

const SOURCES = [
  { kind: 'pandokmun', dir: resolve(ROOT, 'cases', '판독문') },
  { kind: 'lab',       dir: resolve(ROOT, 'cases', '랩데이터') },
].filter((s) => !ONLY_KIND || s.kind === ONLY_KIND);

function listChartDirs(root) {
  try {
    return readdirSync(root).filter((name) => /^\d+$/.test(name));
  } catch {
    return [];
  }
}

function listFiles(dir) {
  return readdirSync(dir)
    .filter((f) => {
      try {
        return statSync(join(dir, f)).isFile();
      } catch {
        return false;
      }
    });
}

function contentType(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'webp') return 'image/webp';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
}

async function main() {
  console.log(`Mode: ${DRY ? 'DRY RUN' : 'WRITE'} | kinds: ${SOURCES.map((s) => s.kind).join(', ')}`);

  // Load children index so we can match chart_number → id.
  const { data: children } = await supabase.from('children').select('id, chart_number');
  const byChart = new Map(children.map((c) => [c.chart_number, c.id]));
  console.log(`Children: ${children.length}`);

  // Cache existing intake_survey so we patch in-place.
  const intakeCache = new Map();
  async function getSurvey(childId) {
    if (intakeCache.has(childId)) return intakeCache.get(childId);
    const { data } = await supabase
      .from('children')
      .select('intake_survey')
      .eq('id', childId)
      .maybeSingle();
    const s = data?.intake_survey ?? {};
    intakeCache.set(childId, s);
    return s;
  }

  const stats = {
    total_files: 0, uploaded: 0, already: 0, failed: 0,
    no_child: 0, charts: 0, patched: 0,
  };

  for (const src of SOURCES) {
    const charts = listChartDirs(src.dir);
    console.log(`\n== ${src.kind}: ${charts.length} chart dirs in ${src.dir} ==`);
    for (const chart of charts) {
      const childId = byChart.get(chart);
      const files = listFiles(join(src.dir, chart));
      stats.total_files += files.length;
      if (!childId) {
        stats.no_child++;
        continue;
      }
      stats.charts++;

      const entries = [];
      for (const f of files) {
        const localPath = join(src.dir, chart, f);
        const storagePath = `${src.kind}/${chart}/${f}`;
        let body;
        try {
          body = readFileSync(localPath);
        } catch (e) {
          console.error(`  read failed ${localPath}: ${e.message}`);
          stats.failed++;
          continue;
        }
        if (DRY) {
          stats.uploaded++;
        } else {
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, body, {
              contentType: contentType(f),
              upsert: false,
            });
          if (error) {
            // "already exists" is not fatal — treat as already present.
            if (/already exists|duplicate/i.test(error.message)) {
              stats.already++;
            } else {
              console.error(`  upload ${storagePath}: ${error.message}`);
              stats.failed++;
              continue;
            }
          } else {
            stats.uploaded++;
          }
        }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        entries.push({ path: storagePath, filename: f, url: pub?.publicUrl });
      }

      if (!entries.length) continue;
      if (DRY) continue;

      const survey = await getSurvey(childId);
      const merged = {
        ...survey,
        raw_files: {
          ...(survey.raw_files ?? {}),
          [src.kind]: entries,
        },
        updated_at: new Date().toISOString(),
      };
      const { error: upErr } = await supabase
        .from('children')
        .update({ intake_survey: merged })
        .eq('id', childId);
      if (upErr) {
        console.error(`  patch intake_survey (${chart}) failed: ${upErr.message}`);
      } else {
        stats.patched++;
        intakeCache.set(childId, merged);
      }
      process.stdout.write('.');
    }
    process.stdout.write('\n');
  }

  console.log('\n=== Summary ===');
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
