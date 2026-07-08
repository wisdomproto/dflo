// ReservationModal — React SPA(예: /report)용 예약(콜백) 신청 모달.
// 정적 사이트(_shell.js)의 예약 오버레이와 동일한 폼·동일한 ai-server 엔드포인트(POST /api/reservations)를
// React 런타임에서 재현. 이름·전화(필수) + 상담 방식(전화/문자) + 상담 내용(선택) + 약관동의.
import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

const AI = import.meta.env.VITE_AI_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:4000';
const CALL_TEL = '1599-0741';

const TERM_SERVICE =
  '본 예약 신청은 연세새봄의원(187 성장클리닉)의 상담 예약을 위한 것입니다. 남겨주신 정보는 예약 상담 연락 목적으로만 사용되며, 진료·처방을 보장하거나 특정 치료 효과를 약속하지 않습니다. 신청자는 언제든 연락 거부 및 정보 삭제를 요청할 수 있습니다.';
const TERM_PRIVACY =
  '• 수집 항목: 성명, 휴대전화번호, 상담 방식 (선택: 상담 내용)\n• 수집·이용 목적: 상담 예약 확인 및 연락\n• 보유·이용 기간: 상담 종료 후 1년 또는 삭제 요청 시까지\n• 동의를 거부할 권리가 있으나, 미동의 시 예약 연락이 어렵습니다.';

function attribution() {
  const p = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach((k) => {
    const v = p.get(k);
    if (v) utm[k] = v;
  });
  return { referrer: document.referrer || null, utm: Object.keys(utm).length ? utm : null };
}

export function ReservationModal({ open, onClose, source = 'report' }: { open: boolean; onClose: () => void; source?: string }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<'phone' | 'text'>('phone');
  const [message, setMessage] = useState('');
  const [agreeService, setAgreeService] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showService, setShowService] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { setDone(false); setErr(''); }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const allAgreed = agreeService && agreePrivacy;
  const toggleAll = (v: boolean) => { setAgreeService(v); setAgreePrivacy(v); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    const digits = phone.replace(/[^0-9]/g, '');
    if (!name.trim()) return setErr('성명을 입력해 주세요.');
    if (digits.length < 9 || digits.length > 11) return setErr('휴대전화번호를 정확히 입력해 주세요.');
    if (!allAgreed) return setErr('필수 약관에 동의해 주세요.');
    setBusy(true);
    try {
      const att = attribution();
      const r = await fetch(`${AI}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), contactMethod: method, message: message.trim(), consent: true, hp, locale: 'ko', referrer: att.referrer, utm: att.utm }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d?.error || '접수에 실패했습니다.');
      setDone(true);
      const w = window as unknown as { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };
      if (typeof w.gtag === 'function') w.gtag('event', 'reservation_submit', { locale: 'ko', source });
      if (typeof w.fbq === 'function') w.fbq('track', 'Lead', { source: 'reservation', locale: 'ko' });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full box-border h-[52px] px-3.5 text-[16px] text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#4A2D6B] focus:ring-2 focus:ring-[#4A2D6B]/15 placeholder:text-gray-400';

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-white">
      {/* header */}
      <header className="flex items-center justify-between h-[52px] px-2 border-b border-gray-100 shrink-0">
        <button type="button" onClick={onClose} aria-label="닫기" className="w-10 h-10 flex items-center justify-center text-gray-800 rounded-full active:scale-95">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="text-[17px] font-extrabold text-gray-900">예약 신청</span>
        <span className="w-10" />
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6">
        {done ? (
          <div className="text-center py-16">
            <div className="w-[68px] h-[68px] mx-auto mb-5 flex items-center justify-center rounded-full bg-[#4A2D6B]/10 text-[#4A2D6B] text-[34px] font-extrabold">✓</div>
            <h2 className="text-[23px] font-extrabold text-gray-900 mb-3">예약이 접수됐어요.</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed mb-7">담당자가 확인 후 남겨주신 번호로<br />빠르게 연락드리겠습니다.</p>
            <button type="button" onClick={onClose} className="min-w-[160px] h-[50px] px-7 rounded-2xl bg-[#4A2D6B] text-white text-[16px] font-extrabold active:scale-95">확인</button>
          </div>
        ) : (
          <form id="rvForm" onSubmit={submit}>
            <h2 className="text-[22px] font-extrabold text-gray-900 leading-snug mb-6">원활한 예약을 위해<br />고객님의 정보를 먼저 입력해 주세요.</h2>

            <div className="mb-5">
              <label htmlFor="rvName" className="block text-[15px] font-bold text-gray-900 mb-2">성명 <i className="text-red-500 not-italic">*</i></label>
              <input id="rvName" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="이름을 입력해 주세요." className={field} />
            </div>
            <div className="mb-5">
              <label htmlFor="rvPhone" className="block text-[15px] font-bold text-gray-900 mb-2">휴대전화번호 <i className="text-red-500 not-italic">*</i></label>
              <input id="rvPhone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="numeric" autoComplete="tel" placeholder="휴대전화번호를 입력해 주세요." className={field} />
            </div>
            <div className="mb-5">
              <span className="block text-[15px] font-bold text-gray-900 mb-2">상담 방식 <i className="text-red-500 not-italic">*</i></span>
              <div className="flex gap-2.5">
                {(['phone', 'text'] as const).map((m) => (
                  <label key={m} className={`flex-1 flex items-center justify-center gap-2 h-[52px] rounded-xl border text-[15px] font-semibold cursor-pointer transition-colors ${method === m ? 'border-[#4A2D6B] bg-[#4A2D6B]/8 text-[#4A2D6B]' : 'border-gray-200 text-gray-600'}`}>
                    <input type="radio" name="rvMethod" checked={method === m} onChange={() => setMethod(m)} className="accent-[#4A2D6B] w-[18px] h-[18px]" />
                    {m === 'phone' ? '전화상담' : '문자상담'}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label htmlFor="rvMsg" className="block text-[15px] font-bold text-gray-900 mb-2">상담 내용 <em className="text-gray-400 text-[13px] font-medium not-italic">(선택)</em></label>
              <textarea id="rvMsg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="아이 나이·키 고민을 간단히 적어주세요." className="w-full box-border min-h-[84px] px-3.5 py-3 text-[16px] leading-relaxed text-gray-900 bg-white border border-gray-200 rounded-xl outline-none resize-y focus:border-[#4A2D6B] focus:ring-2 focus:ring-[#4A2D6B]/15 placeholder:text-gray-400" />
            </div>
            {/* honeypot */}
            <input value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] w-px h-px opacity-0" />

            <div className="pt-5 border-t border-gray-100">
              <div className="text-[15px] font-extrabold text-gray-900">약관동의</div>
              <p className="text-[13px] text-gray-400 mt-1 mb-3">필수 항목 약관에 동의해 주세요.</p>
              <label className="flex items-center gap-2.5 py-1.5 text-[15px] text-gray-800 cursor-pointer">
                <input type="checkbox" checked={allAgreed} onChange={(e) => toggleAll(e.target.checked)} className="accent-[#4A2D6B] w-5 h-5" />
                <b className="font-bold">전체동의</b>
              </label>
              <Term label="서비스 이용약관" checked={agreeService} onChange={setAgreeService} show={showService} onToggle={() => setShowService((v) => !v)} text={TERM_SERVICE} />
              <Term label="개인정보 수집·이용" checked={agreePrivacy} onChange={setAgreePrivacy} show={showPrivacy} onToggle={() => setShowPrivacy((v) => !v)} text={TERM_PRIVACY} />
            </div>

            {err && <p className="mt-4 px-3.5 py-3 bg-red-50 text-red-600 text-[14px] rounded-xl">{err}</p>}
          </form>
        )}
      </div>

      {!done && (
        <div className="shrink-0 px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] border-t border-gray-100 bg-white">
          <button type="submit" form="rvForm" disabled={busy} className="w-full h-[54px] rounded-2xl bg-[#4A2D6B] text-white text-[17px] font-extrabold disabled:opacity-55 active:scale-[0.98] transition-transform">
            {busy ? '신청 중…' : '예약 신청하기'}
          </button>
          <a href={`tel:${CALL_TEL}`} className="flex items-center justify-center gap-2 mt-3 h-12 rounded-2xl border border-gray-200 text-[#4A2D6B] text-[15px] font-bold active:scale-[0.98]">
            📞 바로 전화하기 · {CALL_TEL}
          </a>
        </div>
      )}
    </div>,
    document.body,
  );
}

function Term({ label, checked, onChange, show, onToggle, text }: { label: string; checked: boolean; onChange: (v: boolean) => void; show: boolean; onToggle: () => void; text: string }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 py-2.5 border-t border-gray-100">
        <label className="flex items-center gap-2.5 text-[14.5px] text-gray-800 cursor-pointer">
          <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#4A2D6B] w-5 h-5" />
          <span><b className="text-[#4A2D6B]">(필수)</b> {label}</span>
        </label>
        <button type="button" onClick={onToggle} className="shrink-0 text-[13px] text-gray-400 underline p-1">{show ? '닫기' : '보기'}</button>
      </div>
      {show && <div className="text-[13px] leading-relaxed text-gray-600 bg-gray-50 rounded-lg px-3.5 py-3 mb-1 whitespace-pre-line">{text}</div>}
    </>
  );
}
