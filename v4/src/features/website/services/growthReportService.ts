import { supabase } from '@/shared/lib/supabase';
import type { ReportMeasurement, ReportSurvey } from '../report/types';

function attribution() {
  const ref = (typeof document !== 'undefined' && document.referrer) || '';
  let refSearch = '';
  try { refSearch = new URL(ref).search; } catch { /* noop */ }
  const fromRef = new URLSearchParams(refSearch);
  const here = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const pick = (k: string) => fromRef.get(k) || here.get(k) || null;
  return {
    utm_source: pick('utm_source'), utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'), utm_content: pick('utm_content'),
    referrer: ref || null,
  };
}

export async function saveGrowthReport(
  measurement: ReportMeasurement, survey: ReportSurvey, lang = 'ko',
): Promise<void> {
  try {
    await supabase.from('growth_reports').insert({
      lang, measurement, survey, utm: attribution(),
    });
  } catch { /* tracking must never break UX */ }
}
