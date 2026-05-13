import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

let cached = null;
function load() {
  if (!cached) {
    cached = yaml.load(readFileSync(join(ROOT, 'i18n/messenger.yml'), 'utf8'));
  }
  return cached;
}

export function getMessengerCTA(lang, opts = {}) {
  const all = load();
  const cta = all[lang];
  if (!cta) throw new Error(`no messenger config for lang: ${lang}`);
  if (opts.requireLiveUrl && cta.url === 'TBD') {
    throw new Error(`messenger URL for ${lang} is TBD — populate i18n/messenger.yml`);
  }
  return cta;
}
