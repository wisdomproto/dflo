// src/features/marketing/components/ads/AccountBar.tsx
// 시장별 광고 계정 — 연결 상태 카드 + 등록/편집 모달.
import { useState } from 'react';
import type { AdAccount, AccountStatus } from '../../services/adWorkspaceService';
import { localeFlag } from '../../services/marketingChannelService';

const CURRENCIES = ['KRW', 'USD', 'THB', 'VND'];
function defaultCurrency(market: string): string {
  return market === 'en' ? 'USD' : market === 'th' ? 'THB' : market === 'vi' ? 'VND' : 'KRW';
}

export function AccountBar({
  market,
  accounts,
  onSave,
  onDelete,
}: {
  market: string;
  accounts: AdAccount[];
  onSave: (patch: Partial<AdAccount> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<AdAccount | 'new' | null>(null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-500">
          광고 계정 · {localeFlag(market)} {market.toUpperCase()}
        </div>
        <button type="button" onClick={() => setEditing('new')} className="text-xs font-medium text-[#4A2D6B] hover:underline">
          + 계정 연결
        </button>
      </div>

      {accounts.length === 0 ? (
        <p className="mt-2 text-xs text-gray-400">
          연결된 광고 계정이 없습니다. Meta 광고관리자의 계정 ID(act_…)를 등록하세요.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setEditing(a)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-left hover:border-[#4A2D6B]"
            >
              <span className={`h-2 w-2 rounded-full ${a.status === 'active' ? 'bg-emerald-500' : a.status === 'paused' ? 'bg-amber-500' : 'bg-gray-300'}`} />
              <span>
                <span className="block text-sm font-medium text-gray-800">{a.name}</span>
                <span className="block text-[10px] text-gray-400">{a.externalId || '계정 ID 미입력'} · {a.currency}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {editing && (
        <AccountModal
          market={market}
          account={editing === 'new' ? null : editing}
          onSave={onSave}
          onDelete={onDelete}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function AccountModal({
  market,
  account,
  onSave,
  onDelete,
  onClose,
}: {
  market: string;
  account: AdAccount | null;
  onSave: (patch: Partial<AdAccount> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(account?.name ?? `187 ${market.toUpperCase()} 광고계정`);
  const [externalId, setExternalId] = useState(account?.externalId ?? '');
  const [currency, setCurrency] = useState(account?.currency ?? defaultCurrency(market));
  const [status, setStatus] = useState<AccountStatus>(account?.status ?? 'active');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave({ id: account?.id, platform: 'meta', name: name.trim(), externalId: externalId.trim(), currency, market, status });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none';
  const label = 'mb-1 block text-xs font-medium text-gray-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-bold text-gray-800">{account ? '광고 계정 편집' : '광고 계정 연결'}</h3>
        <div className="space-y-3">
          <div>
            <label className={label}>표시 이름</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div>
            <label className={label}>Meta 광고계정 ID</label>
            <input value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="act_1234567890" className={field} />
            <p className="mt-1 text-[10px] text-gray-400">광고관리자 → 설정 → 광고 계정에서 확인 (act_ 포함)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>통화</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={field}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>상태</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as AccountStatus)} className={field}>
                <option value="active">활성</option>
                <option value="paused">일시중지</option>
                <option value="disabled">비활성</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          {account ? (
            <button
              type="button"
              onClick={() => { if (window.confirm('이 광고 계정 연결을 삭제할까요?')) { onDelete(account.id); onClose(); } }}
              className="text-xs text-red-400 hover:text-red-600"
            >
              연결 삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600">취소</button>
            <button type="button" onClick={save} disabled={busy || !name.trim()} className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
              {busy ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
