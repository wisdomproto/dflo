import { useState, useCallback } from 'react';
import { ImageUploader } from '@/features/admin/components/ImageUploader';
import type { CasesSlide, CaseMeasurementEntry, CaseIntakeInfo } from '../types/websiteSection';

interface CasesSlideEditorProps {
  slide: CasesSlide;
  onUpdate: (updates: Record<string, unknown>) => void;
}

function emptyMeasurement(): CaseMeasurementEntry {
  return { date: '', height: 0, predictedHeight: 0, weight: 0, memo: '' };
}

// Calculate age from birthDate + measurement date
function calcAge(birthDate: string, measureDate: string): string {
  if (!birthDate || !measureDate) return '';
  const b = new Date(birthDate);
  const m = new Date(measureDate);
  if (isNaN(b.getTime()) || isNaN(m.getTime())) return '';
  const age = Math.round((m.getTime() - b.getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10;
  return age > 0 ? `${age}` : '';
}

// Editable columns for the spreadsheet table
// 실제나이 is auto-calculated (read-only), shown between 몸무게 and 뼈나이
const COLUMNS = [
  { key: 'date', label: '날짜', width: 'w-28', type: 'date' },
  { key: 'height', label: '키(cm)', width: 'w-20', type: 'number' },
  { key: 'weight', label: '체중(kg)', width: 'w-20', type: 'number' },
  { key: '_age', label: '실제나이', width: 'w-16', type: 'readonly' },
  { key: 'boneAge', label: '뼈나이', width: 'w-16', type: 'number' },
  { key: 'predictedHeight', label: '예상키(cm)', width: 'w-20', type: 'number' },
  { key: 'memo', label: '메모', width: 'flex-1', type: 'text' },
] as const;

export function CasesSlideEditor({ slide, onUpdate }: CasesSlideEditorProps) {
  const ms = slide.measurements || [];
  const info = slide.intakeInfo || {};
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [openPhotos, setOpenPhotos] = useState<number | null>(null);
  const [pasteHint, setPasteHint] = useState(false);

  const setMeasurements = useCallback((newMs: CaseMeasurementEntry[]) => {
    onUpdate({ measurements: newMs });
  }, [onUpdate]);

  const updateCell = (rowIdx: number, key: string, value: string | number) => {
    const updated = ms.map((m, i) => i === rowIdx ? { ...m, [key]: value } : m);
    setMeasurements(updated);
  };

  const addRow = () => setMeasurements([...ms, emptyMeasurement()]);

  const removeRow = (idx: number) => {
    setMeasurements(ms.filter((_, i) => i !== idx));
    if (openPhotos === idx) setOpenPhotos(null);
  };

  // Handle paste from Excel/Sheets (TSV format)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text.includes('\t') && !text.includes('\n')) return; // Not tabular data
    e.preventDefault();

    const rows = text.trim().split('\n').map((line) => line.split('\t'));
    if (rows.length === 0) return;

    // Try to detect if first row is header
    const firstRow = rows[0];
    const isHeader = firstRow.some((cell) =>
      /날짜|키|몸무게|체중|예상|뼈나이|나이|메모|date|height|weight|bone/i.test(cell)
    );
    const dataRows = isHeader ? rows.slice(1) : rows;

    // Paste column order: 날짜, 실제키, 체중, (실제나이-skip), 뼈나이, 예상키, 메모
    const newEntries: CaseMeasurementEntry[] = dataRows.map((cols) => {
      const entry = emptyMeasurement();
      cols.forEach((val, colIdx) => {
        const v = val.trim();
        if (!v) return;
        switch (colIdx) {
          case 0: // Date
            entry.date = normalizeDate(v);
            break;
          case 1: // Height
            entry.height = parseFloat(v) || 0;
            break;
          case 2: // Weight
            entry.weight = parseFloat(v) || 0;
            break;
          case 3: // 실제나이 (skip - auto calculated)
            break;
          case 4: // Bone Age (supports "13세2개월" format)
            entry.boneAge = parseKoreanAge(v);
            break;
          case 5: // Predicted Height
            entry.predictedHeight = parseFloat(v) || 0;
            break;
          case 6: // Memo
            entry.memo = v;
            break;
        }
      });
      return entry;
    }).filter((e) => e.date || e.height || e.predictedHeight || e.weight);

    if (newEntries.length > 0) {
      // If table is empty, replace. Otherwise append.
      const hasData = ms.some((m) => m.date || m.height);
      setMeasurements(hasData ? [...ms, ...newEntries] : newEntries);
      setPasteHint(false);
    }
  }, [ms, setMeasurements]);

  const updateIntake = (updates: Partial<CaseIntakeInfo>) => {
    onUpdate({ intakeInfo: { ...info, ...updates } });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">📊</span>
        <p className="text-sm font-bold text-gray-700">성장 사례</p>
      </div>

      {/* Patient Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">환자 이름</label>
          <input value={slide.patientName}
            onChange={(e) => onUpdate({ patientName: e.target.value })}
            placeholder="김○○"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">성별</label>
          <select value={slide.gender}
            onChange={(e) => onUpdate({ gender: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]">
            <option value="male">남아</option>
            <option value="female">여아</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">생년월일</label>
          <input type="date" value={slide.birthDate || ''}
            onChange={(e) => onUpdate({ birthDate: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#0F6E56]" />
        </div>
      </div>

      {/* Intake Info (Collapsible) */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <button onClick={() => setIntakeOpen(!intakeOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
          <span className="text-xs font-bold text-gray-600">📋 초진 정보 (문진표)</span>
          <span className={`text-xs text-gray-400 transition-transform ${intakeOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {intakeOpen && (
          <div className="p-4 space-y-4">
            <IntakeSection title="출생 정보">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                <IntakeField label="임신 주수" value={info.gestationalWeeks} type="number" placeholder="38"
                  onChange={(v) => updateIntake({ gestationalWeeks: Number(v) || undefined })} />
                <IntakeField label="출생 몸무게 (kg)" value={info.birthWeight} type="number" placeholder="3.5"
                  onChange={(v) => updateIntake({ birthWeight: Number(v) || undefined })} />
                <IntakeField label="출생 시 특이사항" value={info.birthNote} placeholder="없음"
                  onChange={(v) => updateIntake({ birthNote: v || undefined })} />
              </div>
            </IntakeSection>
            <IntakeSection title="현재 상태">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                <IntakeField label="현재 키 (cm)" value={info.currentHeight} type="number" placeholder="150"
                  onChange={(v) => updateIntake({ currentHeight: Number(v) || undefined })} />
                <IntakeField label="현재 몸무게 (kg)" value={info.currentWeight} type="number" placeholder="40"
                  onChange={(v) => updateIntake({ currentWeight: Number(v) || undefined })} />
                <IntakeField label="작년 성장 (cm)" value={info.yearlyGrowth} placeholder="5~6"
                  onChange={(v) => updateIntake({ yearlyGrowth: v || undefined })} />
                <IntakeField label="학년" value={info.grade} placeholder="초4"
                  onChange={(v) => updateIntake({ grade: v || undefined })} />
                <IntakeField label="학급 내 키 번호" value={info.heightRank} placeholder="1"
                  onChange={(v) => updateIntake({ heightRank: v || undefined })} />
              </div>
            </IntakeSection>
            <IntakeSection title="희망/가족 정보">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                <IntakeField label="희망 키 (cm)" value={info.desiredHeight} placeholder="185"
                  onChange={(v) => updateIntake({ desiredHeight: v || undefined })} />
                <IntakeField label="아버지 키 (cm)" value={info.fatherHeight} type="number" placeholder="180"
                  onChange={(v) => updateIntake({ fatherHeight: Number(v) || undefined })} />
                <IntakeField label="어머니 키 (cm)" value={info.motherHeight} type="number" placeholder="158"
                  onChange={(v) => updateIntake({ motherHeight: Number(v) || undefined })} />
              </div>
            </IntakeSection>
            <IntakeSection title="상태 체크">
              <div className="grid grid-cols-2 gap-1">
                <IntakeCheck label="체육 특기생" checked={info.sportsSpecialist}
                  onChange={(v) => updateIntake({ sportsSpecialist: v })} />
                <IntakeCheck label="부모님 모두 관심" checked={info.parentsInterested}
                  onChange={(v) => updateIntake({ parentsInterested: v })} />
                <IntakeCheck label="아이도 관심" checked={info.childInterested}
                  onChange={(v) => updateIntake({ childInterested: v })} />
                <IntakeCheck label="과거 클리닉 경험" checked={info.pastClinicExperience}
                  onChange={(v) => updateIntake({ pastClinicExperience: v })} />
              </div>
            </IntakeSection>
            <IntakeSection title="기타">
              <div className="space-y-2">
                <IntakeField label="과거 질환" value={info.pastConditions} placeholder="없음"
                  onChange={(v) => updateIntake({ pastConditions: v || undefined })} />
                <IntakeField label="최근 성장 양상" value={info.growthPattern} placeholder="최근 키가 많이 자랐다"
                  onChange={(v) => updateIntake({ growthPattern: v || undefined })} />
                <IntakeField label="사춘기 평가" value={info.pubertyStage} placeholder="아직 발달 전"
                  onChange={(v) => updateIntake({ pubertyStage: v || undefined })} />
                <IntakeField label="키 크지 못하는 원인 (보호자 의견)" value={info.growthConcerns} placeholder="수면시간 부족"
                  onChange={(v) => updateIntake({ growthConcerns: v || undefined })} />
              </div>
            </IntakeSection>
          </div>
        )}
      </div>

      {/* Initial Memo */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">🏥 초진 메모</label>
        <textarea value={slide.initialMemo}
          onChange={(e) => onUpdate({ initialMemo: e.target.value })}
          rows={2} placeholder="처음 방문 시 상태, 고민, 목표 등"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none" />
      </div>

      {/* ===== Spreadsheet-style Measurements ===== */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">📏 회차별 기록</label>
            <button onClick={() => setPasteHint(!pasteHint)}
              className="text-[10px] text-gray-400 hover:text-[#0F6E56] transition-colors" title="붙여넣기 도움말">
              ❓
            </button>
          </div>
          <button onClick={addRow}
            className="text-xs font-semibold text-[#0F6E56] hover:bg-[#E8F5F0] px-3 py-1 rounded-lg transition-colors">
            + 행 추가
          </button>
        </div>

        {/* Paste hint */}
        {pasteHint && (
          <div className="mb-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-[10px] text-blue-700 space-y-1">
            <p className="font-bold">📋 엑셀/구글시트에서 붙여넣기</p>
            <p>열 순서: <strong>날짜 | 키 | 체중 | 실제나이(건너뜀) | 뼈나이 | 예상키 | 메모</strong></p>
            <p>테이블 아무 셀에서 Ctrl+V 하면 자동으로 채워집니다.</p>
            <p>헤더 행이 있어도 자동 감지하여 건너뜁니다.</p>
          </div>
        )}

        {/* Spreadsheet Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden" onPaste={handlePaste}>
          {/* Header */}
          <div className="flex bg-gray-100 border-b border-gray-200">
            <div className="w-8 shrink-0 text-center text-[10px] font-bold text-gray-500 py-2">#</div>
            {COLUMNS.map((col) => (
              <div key={col.key} className={`${col.width} text-[10px] font-bold text-gray-500 py-2 px-1.5`}>
                {col.label}
              </div>
            ))}
            <div className="w-16 shrink-0 text-center text-[10px] font-bold text-gray-500 py-2">📷</div>
            <div className="w-8 shrink-0" />
          </div>

          {/* Rows */}
          {ms.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              <p>데이터 없음</p>
              <p className="text-[10px] mt-1">행을 추가하거나 엑셀에서 Ctrl+V로 붙여넣으세요</p>
            </div>
          ) : (
            ms.map((m, rowIdx) => (
              <div key={rowIdx}>
                <div className={`flex items-center border-b border-gray-100 hover:bg-gray-50/50 ${
                  openPhotos === rowIdx ? 'bg-blue-50/30' : ''
                }`}>
                  {/* Row number */}
                  <div className="w-8 shrink-0 text-center text-[10px] font-bold text-gray-400 py-1">
                    {rowIdx + 1}
                  </div>
                  {/* Cells */}
                  {COLUMNS.map((col) => (
                    <div key={col.key} className={`${col.width} px-0.5 py-0.5`}>
                      {col.type === 'readonly' ? (
                        // Auto-calculated age (read-only)
                        <div className="px-1.5 py-1 text-xs text-gray-400 text-center">
                          {slide.birthDate && m.date ? calcAge(slide.birthDate, m.date) || '-' : '-'}
                        </div>
                      ) : (
                      <input
                        type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                        step={col.type === 'number' ? 'any' : undefined}
                        value={col.type === 'number'
                          ? ((m[col.key as keyof CaseMeasurementEntry] as number) || '')
                          : (m[col.key as keyof CaseMeasurementEntry] as string) ?? ''
                        }
                        onChange={(e) => {
                          const val = col.type === 'number' ? Number(e.target.value) : e.target.value;
                          updateCell(rowIdx, col.key, val);
                        }}
                        className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-[#0F6E56] focus:bg-white rounded px-1.5 py-1 text-xs outline-none transition-colors"
                      />
                      )}
                    </div>
                  ))}
                  {/* Photo toggle */}
                  <div className="w-16 shrink-0 text-center py-1">
                    <button onClick={() => setOpenPhotos(openPhotos === rowIdx ? null : rowIdx)}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        openPhotos === rowIdx ? 'bg-[#0F6E56] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {countPhotos(m)}/4
                    </button>
                  </div>
                  {/* Delete */}
                  <div className="w-8 shrink-0 text-center py-1">
                    <button onClick={() => removeRow(rowIdx)}
                      className="text-[10px] text-gray-300 hover:text-red-500 transition-colors">✕</button>
                  </div>
                </div>

                {/* Photos panel (expanded) */}
                {openPhotos === rowIdx && (
                  <div className="px-10 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-500 mb-2">📷 #{rowIdx + 1}회 사진</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      <PhotoUpload label="정면 사진" url={m.photoFront}
                        onUploaded={(url) => updateCell(rowIdx, 'photoFront', url)} />
                      <PhotoUpload label="측면 사진" url={m.photoSide}
                        onUploaded={(url) => updateCell(rowIdx, 'photoSide', url)} />
                      <PhotoUpload label="정면 X-ray" url={m.xrayFront}
                        onUploaded={(url) => updateCell(rowIdx, 'xrayFront', url)} />
                      <PhotoUpload label="측면 X-ray" url={m.xraySide}
                        onUploaded={(url) => updateCell(rowIdx, 'xraySide', url)} />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Footer: add row */}
          <button onClick={addRow}
            className="w-full py-2 text-[10px] text-gray-400 hover:text-[#0F6E56] hover:bg-gray-50 transition-colors border-t border-gray-100">
            + 행 추가
          </button>
        </div>
      </div>

      {/* Final Memo */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">🎉 마무리 메모</label>
        <textarea value={slide.finalMemo}
          onChange={(e) => onUpdate({ finalMemo: e.target.value })}
          rows={2} placeholder="치료 결과, 성과, 후속 계획 등"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0F6E56] resize-none" />
      </div>

      {/* Options */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox"
            checked={slide.showCta !== false}
            onChange={(e) => onUpdate({ showCta: e.target.checked })}
            className="w-4 h-4 rounded accent-[#0F6E56]" />
          <span className="text-xs text-gray-600">하단 상담 CTA</span>
        </label>

        {/* Font Scale */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <span className="text-xs text-gray-500 shrink-0">🔤 글자 크기</span>
          <input type="range" min={70} max={140} step={5} value={slide.fontScale ?? 70}
            onChange={(e) => onUpdate({ fontScale: Number(e.target.value) })}
            className="flex-1 accent-[#0F6E56] h-1" />
          <span className="text-[10px] text-gray-500 w-10 text-right">{slide.fontScale ?? 70}%</span>
          {slide.fontScale && slide.fontScale !== 70 && (
            <button onClick={() => onUpdate({ fontScale: 70 })}
              className="text-[10px] text-gray-400 hover:text-red-400">↩</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Helper: parse Korean age format ("13세2개월" → 13.17, "13세6~7개월" → 13.5) ----
function parseKoreanAge(v: string): number | undefined {
  // Already a plain number: "13", "13.5"
  if (/^\d+\.?\d*$/.test(v.trim())) {
    const n = parseFloat(v);
    return n > 0 ? n : undefined;
  }
  // Korean format: "13세2개월", "13세6~7개월", "12세3개월"
  const match = v.match(/(\d+)\s*세\s*(?:(\d+)(?:\s*[~\-]\s*(\d+))?\s*개월)?/);
  if (match) {
    const years = parseInt(match[1], 10);
    let months = 0;
    if (match[2]) {
      months = parseInt(match[2], 10);
      // Range like "6~7" → average
      if (match[3]) {
        months = (months + parseInt(match[3], 10)) / 2;
      }
    }
    const age = Math.round((years + months / 12) * 10) / 10;
    return age > 0 ? age : undefined;
  }
  // Fallback: try parseFloat
  const n = parseFloat(v);
  return n > 0 ? n : undefined;
}

// ---- Helper: normalize date string ----
function normalizeDate(v: string): string {
  // Handle various date formats: 2024-01-15, 2024.01.15, 2024/01/15, 01/15/2024
  const cleaned = v.replace(/[./]/g, '-');
  const parts = cleaned.split('-');
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    if (c.length === 4) return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
  }
  return v;
}

// ---- Sub-components ----

function IntakeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-500 mb-2">{title}</p>
      {children}
    </div>
  );
}

function IntakeField({ label, value, placeholder, type, onChange, className }: {
  label: string; value: string | number | undefined; placeholder?: string;
  type?: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[10px] text-gray-400">{label}</label>
      <input type={type || 'text'} step={type === 'number' ? '0.1' : undefined}
        value={value ?? ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:border-[#0F6E56]" />
    </div>
  );
}

function IntakeCheck({ label, checked, onChange }: {
  label: string; checked?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer py-0.5">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded accent-[#0F6E56]" />
      <span className="text-[10px] text-gray-600">{label}</span>
    </label>
  );
}

function PhotoUpload({ label, url, onUploaded }: {
  label: string; url?: string; onUploaded: (url: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-400 mb-0.5 block">{label}</label>
      <ImageUploader folder="cases" currentUrl={url} onUploaded={onUploaded} />
    </div>
  );
}

function countPhotos(m: CaseMeasurementEntry): number {
  return [m.photoFront, m.photoSide, m.xrayFront, m.xraySide].filter(Boolean).length;
}
