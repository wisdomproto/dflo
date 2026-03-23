import { useState } from 'react';
import Card from '@/shared/components/Card';
import Modal from '@/shared/components/Modal';
import { SectionTitle } from './SectionTitle';

const DEFAULT_SUPPLEMENTS = ['비타민D', '칼슘', '아연', '유산균', '오메가3'];
const SUPPL_STORAGE_KEY = '187_supplement_list';

function loadSupplementList(): string[] {
  try {
    const saved = localStorage.getItem(SUPPL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SUPPLEMENTS;
  } catch { return DEFAULT_SUPPLEMENTS; }
}
function saveSupplementList(list: string[]) {
  localStorage.setItem(SUPPL_STORAGE_KEY, JSON.stringify(list));
}

interface Props {
  supplements: string[];
  onSupplementsChange: (v: string[]) => void;
}

export function SupplementCard({ supplements, onSupplementsChange }: Props) {
  const [supplList, setSupplList] = useState<string[]>(loadSupplementList);
  const [showSupplSettings, setShowSupplSettings] = useState(false);
  const [newSupplName, setNewSupplName] = useState('');

  return (
    <>
      <Card>
        <SectionTitle icon="💊" text="영양제" right={
          <div className="flex items-center gap-2">
            <button onClick={() => { const allOn = supplList.every((s) => supplements.includes(s)); onSupplementsChange(allOn ? [] : [...supplList]); }}
              className="text-[10px] font-medium text-primary active:text-primary/70">
              {supplList.every((s) => supplements.includes(s)) ? '전체 해제' : '전체 선택'}
            </button>
            <button onClick={() => setShowSupplSettings(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        } />
        <div className="flex flex-wrap gap-2">
          {supplList.map((s) => {
            const on = supplements.includes(s);
            return (
              <button key={s} onClick={() => onSupplementsChange(on ? supplements.filter((x) => x !== s) : [...supplements, s])}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${on ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {on ? '✓ ' : ''}{s}
              </button>
            );
          })}
        </div>
      </Card>

      <Modal isOpen={showSupplSettings} onClose={() => { setShowSupplSettings(false); setNewSupplName(''); }} title="영양제 설정">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input type="text" value={newSupplName} onChange={(e) => setNewSupplName(e.target.value)}
              placeholder="영양제 이름 입력" maxLength={20}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSupplName.trim() && !supplList.includes(newSupplName.trim())) {
                  const updated = [...supplList, newSupplName.trim()];
                  setSupplList(updated); saveSupplementList(updated); setNewSupplName('');
                }
              }}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={() => {
              if (!newSupplName.trim() || supplList.includes(newSupplName.trim())) return;
              const updated = [...supplList, newSupplName.trim()];
              setSupplList(updated); saveSupplementList(updated); setNewSupplName('');
            }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white active:scale-95 transition-transform">
              추가
            </button>
          </div>
          <div className="space-y-1">
            {supplList.map((s) => (
              <div key={s} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                <span className="text-sm text-gray-700">{s}</span>
                <button onClick={() => {
                  const updated = supplList.filter((x) => x !== s);
                  setSupplList(updated); saveSupplementList(updated);
                  onSupplementsChange(supplements.filter((x) => x !== s));
                }} className="text-xs text-red-400 active:text-red-600 font-medium">삭제</button>
              </div>
            ))}
          </div>
          {supplList.length === 0 && <p className="text-center text-sm text-gray-400 py-4">등록된 영양제가 없습니다</p>}
        </div>
      </Modal>
    </>
  );
}
