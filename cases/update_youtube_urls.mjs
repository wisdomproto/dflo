// Add YouTube URLs to the 7 cases in "치료 사례" section
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mufjnulwnppgvibmmbfo.supabase.co',
  'YOUR_SUPABASE_SERVICE_ROLE_KEY'
);

// Patient name → YouTube URL mapping (from original Excel)
const youtubeMap = {
  '유건': 'https://youtu.be/9stIufkcGpw?si=YBp3RleiPvzjkR4P',
  '윤우': 'https://youtu.be/K-IVd1k-7sg?si=noyYpjVcmP7H-3Fz',
  '재윤': '',  // no YouTube link in original
  '민찬': 'https://youtu.be/FbRIjuoDCsU?si=BtZzVVYI-2x5ja07',
  '지훈': 'https://youtu.be/MSxSk8NePVc?si=-us_26KTc8c1HTuG',
  '세희': 'https://youtu.be/MSxSk8NePVc?si=-us_26KTc8c1HTuG',  // same video as brother
  '고키': 'https://youtu.be/K-IVd1k-7sg?si=noyYpjVcmP7H-3Fz',
};

async function main() {
  const { data, error } = await supabase
    .from('website_sections')
    .select('*')
    .eq('title', '치료 사례')
    .single();

  if (error || !data) {
    console.error('Section not found:', error?.message);
    process.exit(1);
  }

  const slides = data.slides.map(s => {
    const url = youtubeMap[s.patientName];
    if (url) {
      s.youtubeUrl = url;
      console.log(`  ${s.patientName}: ${url}`);
    } else {
      console.log(`  ${s.patientName}: (no video)`);
    }
    return s;
  });

  const { error: updateErr } = await supabase
    .from('website_sections')
    .update({ slides, updated_at: new Date().toISOString() })
    .eq('id', data.id);

  if (updateErr) {
    console.error('Update error:', updateErr.message);
    process.exit(1);
  }

  console.log(`\nUpdated ${slides.length} cases with YouTube URLs`);
}

main().catch(console.error);
