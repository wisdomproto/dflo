// src/features/marketing/components/ChannelRegistryTab.tsx
import { useEffect, useState } from 'react';
import type { MarketingChannel } from '../services/marketingChannelService';
import {
  fetchChannels,
  saveChannel,
  deleteChannel,
  syncYoutubeChannel,
  LOCALES,
  localeFlag,
} from '../services/marketingChannelService';
import { getMetaConnection, startMetaConnect, disconnectMeta, type MetaConnection } from '../services/metaConnectionService';

const PLATFORMS = [
  { id: 'instagram', label: '📷 Instagram' },
  { id: 'threads', label: '🧵 Threads' },
  { id: 'facebook', label: '👍 Facebook' },
  { id: 'tiktok', label: '🎵 TikTok' },
  { id: 'website', label: '🌐 웹사이트' },
] as const;

function platformLabel(id: string): string {
  return PLATFORMS.find((p) => p.id === id)?.label ?? id;
}

type Draft = Partial<MarketingChannel>;

const EMPTY: Draft = {
  platform: 'instagram', name: '', handle: '', url: '',
  followers: 0, note: '', locale: 'ko', isActive: true,
};

function ChannelFormRow({
  draft,
  setDraft,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const cls = 'rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#4A2D6B] focus:outline-none';
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <select
        value={draft.platform ?? 'instagram'}
        onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
        className={cls}
      >
        {PLATFORMS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <input
        value={draft.name ?? ''}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        placeholder="표시명"
        className={`${cls} min-w-[120px] flex-1`}
      />
      <input
        value={draft.handle ?? ''}
        onChange={(e) => setDraft({ ...draft, handle: e.target.value })}
        placeholder="핸들 (@name)"
        className={`${cls} min-w-[110px]`}
      />
      <input
        value={draft.url ?? ''}
        onChange={(e) => setDraft({ ...draft, url: e.target.value })}
        placeholder="URL"
        className={`${cls} min-w-[140px] flex-1`}
      />
      <input
        type="number"
        value={draft.followers ?? 0}
        onChange={(e) => setDraft({ ...draft, followers: Number(e.target.value) || 0 })}
        placeholder="팔로워"
        className={`${cls} w-24`}
      />
      <input
        value={draft.note ?? ''}
        onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        placeholder="메모"
        className={`${cls} min-w-[110px] flex-1`}
      />
      <select
        value={draft.locale ?? 'ko'}
        onChange={(e) => setDraft({ ...draft, locale: e.target.value })}
        className={cls}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={draft.isActive ?? true}
          onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
        />
        활성
      </label>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!draft.name?.trim()}
        className="rounded-lg bg-[#4A2D6B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {submitLabel}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="px-2 text-sm text-gray-400 hover:text-gray-600">
          취소
        </button>
      )}
    </div>
  );
}

export function ChannelRegistryTab() {
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const [localeFilter, setLocaleFilter] = useState<string>('all');
  const visible = localeFilter === 'all' ? channels : channels.filter((c) => c.locale === localeFilter);
  const [meta, setMeta] = useState<MetaConnection>({ connected: false });
  const reloadMeta = () => getMetaConnection().then(setMeta).catch(() => setMeta({ connected: false }));

  const reload = () => {
    fetchChannels().then(setChannels);
  };
  useEffect(reload, []);
  useEffect(() => { reloadMeta(); }, []);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('meta_connected') === '1') {
      reloadMeta();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const add = async () => {
    if (!draft.name?.trim()) return;
    setErr(null);
    try {
      await saveChannel(draft);
      setDraft(EMPTY);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '추가 실패');
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    setErr(null);
    try {
      await saveChannel({ ...editDraft, id: editId });
      setEditId(null);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '수정 실패');
    }
  };

  const remove = async (c: MarketingChannel) => {
    if (!window.confirm(`'${c.name}' 채널을 삭제할까요?`)) return;
    setErr(null);
    try {
      await deleteChannel(c.id);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const sync = async (c: MarketingChannel) => {
    const key = c.handle?.trim() || c.url?.trim();
    if (!key) {
      setSyncMsg((m) => ({ ...m, [c.id]: '핸들을 먼저 입력하세요.' }));
      return;
    }
    setSyncing(c.id);
    setSyncMsg((m) => ({ ...m, [c.id]: '' }));
    try {
      const stats = await syncYoutubeChannel(key);
      await saveChannel({
        ...c,
        name: c.name || stats.title,
        followers: stats.subscribers,
        followerSnapshotAt: new Date().toISOString(),
      });
      setSyncMsg((m) => ({ ...m, [c.id]: `✓ 구독자 ${stats.subscribers.toLocaleString()}명` }));
      reload();
    } catch (e) {
      setSyncMsg((m) => ({ ...m, [c.id]: e instanceof Error ? e.message : '동기화 실패' }));
    } finally {
      setSyncing(null);
    }
  };

  const addMetaChannel = async (
    platform: 'facebook' | 'instagram' | 'threads',
    pg: NonNullable<MetaConnection['pages']>[number],
  ) => {
    const locale = localeFilter === 'all' ? 'ko' : localeFilter;
    await saveChannel({
      platform,
      name: platform === 'instagram' ? (pg.instagram?.username ?? pg.name) : pg.name,
      locale,
      isActive: true,
      metaPageId: pg.id,
      metaIgId: pg.instagram?.id ?? null,
      metaThreadsId: pg.threadsId,
    });
    reload();
  };

  return (
    <div className="space-y-3 p-6">
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
        <div className="text-sm">
          <span className="font-semibold text-gray-800">Meta 연결</span>{' '}
          {meta.connected ? (
            <span className="text-emerald-600">✓ {meta.userName} · 페이지 {meta.pages?.length ?? 0}개</span>
          ) : (
            <span className="text-gray-400">미연결</span>
          )}
        </div>
        {meta.connected ? (
          <button type="button" onClick={async () => { await disconnectMeta(); reloadMeta(); }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600">연결 해제</button>
        ) : (
          <button type="button" onClick={() => startMetaConnect(window.location.origin + '/marketing/channels')}
            className="rounded-lg bg-[#1877f2] px-3 py-1.5 text-xs font-semibold text-white">Meta 연결</button>
        )}
      </div>
      {meta.connected && meta.pages && meta.pages.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 text-xs font-semibold text-gray-500">연결된 페이지에서 채널 추가 (언어 {localeFilter === 'all' ? 'ko' : localeFilter})</div>
          <div className="flex flex-wrap gap-2">
            {meta.pages.map((pg) => (
              <div key={pg.id} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs">
                <span className="font-medium text-gray-700">{pg.name}</span>
                <button type="button" title="Facebook 채널 추가" onClick={() => addMetaChannel('facebook', pg)} className="rounded bg-[#1877f2] px-1.5 text-white">FB</button>
                {pg.instagram && (
                  <button type="button" title="Instagram 채널 추가" onClick={() => addMetaChannel('instagram', pg)} className="rounded bg-pink-500 px-1.5 text-white">IG</button>
                )}
                <button type="button" title="Threads 채널 추가" onClick={() => addMetaChannel('threads', pg)} className="rounded bg-gray-900 px-1.5 text-white">TH</button>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-gray-400">현재 선택된 언어로 채널이 추가됩니다(전체일 땐 ko).</p>
        </div>
      )}
      <ChannelFormRow draft={draft} setDraft={setDraft} onSubmit={add} submitLabel="+ 추가" />
      <div className="flex flex-wrap gap-1">
        {[{ code: 'all', flag: '🌐', label: '전체' }, ...LOCALES].map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocaleFilter(l.code)}
            className={`rounded-full px-2.5 py-0.5 text-xs ${
              localeFilter === l.code ? 'bg-[#4A2D6B] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {l.flag} {l.label}
          </button>
        ))}
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">등록된 채널이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((c) =>
            editId === c.id ? (
              <ChannelFormRow
                key={c.id}
                draft={editDraft}
                setDraft={setEditDraft}
                onSubmit={saveEdit}
                onCancel={() => setEditId(null)}
                submitLabel="저장"
              />
            ) : (
              <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
                <span className="text-sm">{platformLabel(c.platform)}</span>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-medium ${c.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                    {localeFlag(c.locale)} {c.name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    {c.handle && <span>{c.handle}</span>}
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noreferrer" className="text-[#4A2D6B] hover:underline">
                        링크
                      </a>
                    )}
                    {c.note && <span>· {c.note}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums text-gray-700">
                    {c.followers.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {c.followerSnapshotAt ? `${c.followerSnapshotAt.slice(0, 10)} 기준` : '팔로워'}
                  </div>
                </div>
                {c.platform === 'youtube' && (
                  <button
                    type="button"
                    onClick={() => sync(c)}
                    disabled={syncing === c.id}
                    className="rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-600 disabled:opacity-40"
                  >
                    {syncing === c.id ? '동기화 중…' : '📊 동기화'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditId(c.id);
                    setEditDraft(c);
                  }}
                  className="px-2 text-xs text-gray-400 hover:text-[#4A2D6B]"
                >
                  수정
                </button>
                <button
                  type="button"
                  aria-label="삭제"
                  onClick={() => remove(c)}
                  className="px-2 text-gray-300 hover:text-red-500"
                >
                  🗑
                </button>
                {syncMsg[c.id] && (
                  <span className="w-full text-right text-xs text-gray-500">{syncMsg[c.id]}</span>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
