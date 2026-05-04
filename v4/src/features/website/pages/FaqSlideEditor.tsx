import { useState } from 'react';
import type { FaqSlide, FaqItem } from '../types/websiteSection';

interface FaqSlideEditorProps {
  slide: FaqSlide;
  onUpdate: (updates: Record<string, unknown>) => void;
}

function uid() {
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function FaqSlideEditor({ slide, onUpdate }: FaqSlideEditorProps) {
  const s = slide;
  // KO 기본, ZH 토글 시 ZH 필드 노출
  const [lang, setLang] = useState<'ko' | 'zh'>('ko');

  const updateItem = (id: string, patch: Partial<FaqItem>) => {
    onUpdate({ items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  };

  const removeItem = (id: string) => {
    onUpdate({ items: s.items.filter((it) => it.id !== id) });
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= s.items.length) return;
    const next = [...s.items];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    onUpdate({ items: next });
  };

  const addItem = () => {
    const next: FaqItem = {
      id: uid(),
      question: '',
      answer: '',
    };
    onUpdate({ items: [...s.items, next] });
  };

  return (
    <div className="space-y-4">
      {/* 언어 토글 (편집 언어 — 표시는 클라이언트 토글로 별도) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">편집 언어:</span>
        <button onClick={() => setLang('ko')}
          className={`text-xs px-2.5 py-1 rounded-full ${lang === 'ko' ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-500'}`}>
          한국어
        </button>
        <button onClick={() => setLang('zh')}
          className={`text-xs px-2.5 py-1 rounded-full ${lang === 'zh' ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-500'}`}>
          中文
        </button>
        <span className="text-[10px] text-gray-400 ml-1">중문 비워두면 한국어만 노출</span>
      </div>

      {/* 헤드라인 영역 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">헤드라인</p>

        <Field label="배지 (선택)"
          value={lang === 'ko' ? (s.badge || '') : (s.badgeZh || '')}
          onChange={(v) => onUpdate(lang === 'ko' ? { badge: v } : { badgeZh: v })}
          placeholder={lang === 'ko' ? '자주 묻는 질문' : '常见问题'} />

        <Field label="제목 (multi-line)" multiline
          value={lang === 'ko' ? s.title : (s.titleZh || '')}
          onChange={(v) => onUpdate(lang === 'ko' ? { title: v } : { titleZh: v })}
          placeholder={lang === 'ko' ? '상담 전에\n가장 궁금한 5가지' : '咨询前\n最关心的5个问题'} />

        <Field label="부제 (선택)" multiline
          value={lang === 'ko' ? (s.subtitle || '') : (s.subtitleZh || '')}
          onChange={(v) => onUpdate(lang === 'ko' ? { subtitle: v } : { subtitleZh: v })}
          placeholder={lang === 'ko' ? '부모님이 가장 많이 물으셨던 질문들' : '家长们最常询问的问题'} />
      </div>

      {/* Q&A 항목 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Q&A 항목 ({s.items.length})</p>
          <button onClick={addItem}
            className="text-xs font-bold text-[#0F6E56] bg-[#E8F5F0] px-3 py-1.5 rounded-lg hover:bg-[#D0EDE4] transition-colors">
            + 항목 추가
          </button>
        </div>

        {s.items.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-6">+ 항목 추가 버튼을 눌러 Q&A 를 등록하세요.</p>
        )}

        {s.items.map((item, idx) => (
          <div key={item.id} className="rounded-xl border border-gray-200 p-3 space-y-2 bg-gray-50/40">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                Q{idx + 1}
              </span>
              <div className="flex-1" />
              <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 text-xs">↑</button>
              <button onClick={() => moveItem(idx, 1)} disabled={idx === s.items.length - 1}
                className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 text-xs">↓</button>
              <button onClick={() => {
                if (confirm(`Q${idx + 1} 항목을 삭제하시겠습니까?`)) removeItem(item.id);
              }}
                className="w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 text-xs">✕</button>
            </div>

            <Field label="질문"
              value={lang === 'ko' ? item.question : (item.questionZh || '')}
              onChange={(v) => updateItem(item.id, lang === 'ko' ? { question: v } : { questionZh: v })}
              placeholder={lang === 'ko' ? '한국에 가지 않아도 진료 받을 수 있나요?' : '不去韩国也能看诊吗?'} />

            <Field label="답변 (multi-line, 빈 줄로 문단 구분)" multiline rows={4}
              value={lang === 'ko' ? item.answer : (item.answerZh || '')}
              onChange={(v) => updateItem(item.id, lang === 'ko' ? { answer: v } : { answerZh: v })}
              placeholder={lang === 'ko' ? '네, 가능합니다.\n\n첫 상담은 모두 영상 통화로...' : '是的,完全可以。\n\n首次咨询全部通过视频通话...'} />
          </div>
        ))}
      </div>

      {/* 하단 CTA 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">하단 CTA 카드 (선택)</p>

        <Field label="헤드라인"
          value={lang === 'ko' ? (s.ctaHeadline || '') : (s.ctaHeadlineZh || '')}
          onChange={(v) => onUpdate(lang === 'ko' ? { ctaHeadline: v } : { ctaHeadlineZh: v })}
          placeholder={lang === 'ko' ? '더 궁금한 점이 있으신가요?' : '还有其他问题吗?'} />

        <Field label="큰 제목"
          value={lang === 'ko' ? (s.ctaTitle || '') : (s.ctaTitleZh || '')}
          onChange={(v) => onUpdate(lang === 'ko' ? { ctaTitle: v } : { ctaTitleZh: v })}
          placeholder={lang === 'ko' ? '의사에게 직접 물어보세요' : '直接向医师咨询'} />

        <Field label="버튼 텍스트"
          value={lang === 'ko' ? (s.ctaButtonText || '') : (s.ctaButtonTextZh || '')}
          onChange={(v) => onUpdate(lang === 'ko' ? { ctaButtonText: v } : { ctaButtonTextZh: v })}
          placeholder={lang === 'ko' ? '📲 무료 첫 상담 신청' : '📲 申请免费首诊'} />

        <Field label="버튼 클릭 시 이동 URL (언어 공통)"
          value={s.ctaButtonUrl || ''}
          onChange={(v) => onUpdate({ ctaButtonUrl: v })}
          placeholder="https://pf.kakao.com/_ZxneSb" />
      </div>
    </div>
  );
}

// ============= 작은 입력 컴포넌트 =============
function Field({ label, value, onChange, placeholder, multiline, rows }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-500 mb-1 block">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows ?? 2}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56] resize-y" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
      )}
    </div>
  );
}
