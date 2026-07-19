import { useParams } from 'react-router-dom';
import type { IntakeLang } from '../types';
import { INTAKE_LANGS } from '../types';
import IntakeWizard from '../components/IntakeWizard';

// Per-language direct link (e.g. /intake/th) — admin shares these.
// Unknown/missing lang falls back to English (default). Language picker lives at /intake (GlobalIntakePage).
export default function PublicIntakePage() {
  const { lang: rawLang } = useParams();
  const lang: IntakeLang = INTAKE_LANGS.includes(rawLang as IntakeLang)
    ? (rawLang as IntakeLang)
    : 'en';
  return <IntakeWizard lang={lang} />;
}
