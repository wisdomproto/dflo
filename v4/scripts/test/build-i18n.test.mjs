import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';
import { ACTIVE_LANGS } from '../lib/constants.mjs';
import { getMessengerCTA } from '../lib/messenger.mjs';

test('build:i18n generates /ko/index.html with no placeholders left', () => {
  execSync('node scripts/build-i18n.mjs', { cwd: process.cwd(), stdio: 'pipe' });

  const outPath = 'public/ko/index.html';
  assert.ok(existsSync(outPath), `${outPath} should exist after build`);

  const html = readFileSync(outPath, 'utf8');
  assert.ok(!/\{\{[^}]+\}\}/.test(html), 'no {{placeholder}} should remain');
  assert.ok(/<html\s+lang="ko"/.test(html), 'html lang attribute should be ko');
  assert.ok(html.includes('우리 아이 키'), 'should contain Korean hero copy');
});

test('GEO notices render in all published locales and both llms endpoints', () => {
  const seo = yaml.load(readFileSync('i18n/seo.yml', 'utf8'));
  for (const lang of ACTIVE_LANGS) {
    const { geo } = yaml.load(readFileSync(`i18n/locales/${lang}.yml`, 'utf8'));
    const home = readFileSync(`public/${lang}/index.html`, 'utf8');
    const cases = readFileSync(`public/${lang}/cases.html`, 'utf8');
    for (const html of [home, cases]) {
      const grid = html.match(/<div class="rc-grid">([\s\S]*?)<\/div>\s*<p class="case-results-note">([^<]+)<\/p>/);
      assert.equal(grid?.[2], geo.case_notice, lang);
      assert.equal((grid[1].match(/class="rc-card"/g) ?? []).length, 4, lang);
    }
    assert.ok(!home.includes('/images/facility-3.'), lang);

    const { remote_notice: remoteNotice } = seo[lang];
    const faq = [...home.matchAll(/<p class="faq-a">([^<]+)<\/p>/g)].map((match) => match[1]);
    const schema = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((match) => JSON.parse(match[1]))
      .find((item) => item['@type'] === 'FAQPage');
    assert.equal(faq.filter((answer) => answer.endsWith(remoteNotice)).length, 2, lang);
    assert.deepEqual(schema.mainEntity.map((item) => item.acceptedAnswer.text), faq, lang);

    const hasConsultPage = (getMessengerCTA(lang).consult_channels?.length ?? 0) >= 1;
    const attributedPages = [home];
    if (hasConsultPage) {
      const consult = readFileSync(`public/${lang}/consult.html`, 'utf8');
      assert.ok(consult.includes(remoteNotice), lang);
      attributedPages.push(consult);
    }
    for (const html of attributedPages) {
      const footer = html.match(/<footer class="clinic-attribution">([\s\S]*?)<\/footer>/)?.[1];
      assert.ok(footer?.includes(geo.channel), lang);
      assert.ok(footer.includes('href="https://www.yssaebomq.com/"'), lang);
    }
  }

  const llms = readFileSync('public/llms.txt', 'utf8');
  assert.ok(llms.startsWith('# '));
  assert.ok(llms.includes(seo.en.remote_notice));
  assert.ok(!llms.includes('(Pediatrics)'));
  assert.equal(readFileSync('public/llms-full.txt', 'utf8'), llms);
});
