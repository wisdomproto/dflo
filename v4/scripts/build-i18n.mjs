import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { render } from './lib/render.mjs';
import { getMessengerCTA } from './lib/messenger.mjs';
import { buildHead } from './lib/seo.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ACTIVE_LANGS = ['ko', 'th', 'vi', 'en'];

function loadLocale(lang) {
  const path = join(ROOT, 'i18n/locales', `${lang}.yml`);
  return yaml.load(readFileSync(path, 'utf8'));
}

function writeFile(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  console.log(`  wrote ${path}`);
}

function buildLocale(lang) {
  console.log(`[i18n] building ${lang}`);
  const data = loadLocale(lang);
  data.messenger = getMessengerCTA(lang, { requireLiveUrl: true });
  data.seo_head = buildHead(lang, { path: '/' });
  const template = readFileSync(join(ROOT, 'i18n/template/index.html'), 'utf8');
  const html = render(template, data);
  writeFile(join(ROOT, 'public/test', lang, 'index.html'), html);
}

function main() {
  for (const lang of ACTIVE_LANGS) {
    buildLocale(lang);
  }
  console.log(`[i18n] done — ${ACTIVE_LANGS.length} locale(s)`);
}

main();
