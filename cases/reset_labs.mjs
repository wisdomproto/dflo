// Reset lab_tests for given chart_numbers. Also removes any 'Imported from
// eone lab OCR pipeline' visits that become orphaned after the lab rows go
// away so a fresh import doesn't pile up duplicate visits.
import { createClient } from '../v4/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'node:fs';

const envTxt = readFileSync('./ai-server/.env', 'utf8');
const env = {};
for (const line of envTxt.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const s = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const charts = process.argv.slice(2);
if (!charts.length) {
  console.error('usage: node cases/reset_labs.mjs <chart_number> [...]');
  process.exit(1);
}

for (const chart of charts) {
  const { data: child } = await s
    .from('children')
    .select('id, name')
    .eq('chart_number', chart)
    .maybeSingle();
  if (!child) {
    console.log(`  ${chart}: not found`);
    continue;
  }
  const { error: delErr, count } = await s
    .from('lab_tests')
    .delete({ count: 'exact' })
    .eq('child_id', child.id);
  if (delErr) {
    console.error(`  ${chart}: delete failed: ${delErr.message}`);
    continue;
  }
  // Remove visits that were auto-created for lab imports and now have no
  // clinical data attached.
  const { data: emptyVisits } = await s
    .from('visits')
    .select('id, notes')
    .eq('child_id', child.id)
    .ilike('notes', 'Imported from eone lab OCR pipeline%');
  let visitsRemoved = 0;
  for (const v of emptyVisits || []) {
    // Only delete if truly empty of other clinical data.
    const { data: m } = await s.from('hospital_measurements').select('id').eq('visit_id', v.id).limit(1);
    const { data: x } = await s.from('xray_readings').select('id').eq('visit_id', v.id).limit(1);
    const { data: r } = await s.from('prescriptions').select('id').eq('visit_id', v.id).limit(1);
    if ((m?.length || 0) + (x?.length || 0) + (r?.length || 0) === 0) {
      await s.from('visits').delete().eq('id', v.id);
      visitsRemoved += 1;
    }
  }
  console.log(`  ${chart} ${child.name}: removed ${count ?? '?'} lab rows, ${visitsRemoved} empty visits`);
}
