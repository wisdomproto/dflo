// src/features/marketing/components/ChannelRegistryTab.tsx
import { useEffect, useRef, useState } from 'react';
import type { MarketingChannel } from '../services/marketingChannelService';
import {
  fetchChannels,
  saveChannel,
  deleteChannel,
  syncYoutubeChannel,
  LOCALES,
} from '../services/marketingChannelService';
import { getMetaConnection, startMetaConnect, disconnectMeta, type MetaConnection } from '../services/metaConnectionService';

const PLATFORMS = [
  { id: 'instagram', label: '📷 Instagram' },
  { id: 'threads', label: '🧵 Threads' },
  { id: 'facebook', label: '👍 Facebook' },
  { id: 'tiktok', label: '🎵 TikTok' },
  { id: 'website', label: '🌐 웹사이트' },
] as const;

// 플랫폼별 카드 악센트(색상/아이콘). 카드 상단 바·아이콘 배경에 사용.
const PLATFORM_META: Record<string, { label: string; icon: string; accent: string; soft: string }> = {
  facebook: { label: 'Facebook', icon: '👍', accent: '#1877f2', soft: '#E7F0FF' },
  instagram: { label: 'Instagram', icon: '📷', accent: '#E1306C', soft: '#FDE7F0' },
  threads: { label: 'Threads', icon: '🧵', accent: '#111827', soft: '#F1F1F2' },
  tiktok: { label: 'TikTok', icon: '🎵', accent: '#111827', soft: '#F1F1F2' },
  website: { label: '웹사이트', icon: '🌐', accent: '#4A2D6B', soft: '#EFE9F5' },
};
function platformMeta(id: string) {
  return PLATFORM_META[id] ?? { label: id, icon: '🔗', accent: '#6b7280', soft: '#f3f4f6' };
}
// 국가 섹션 안에서 항상 이 순서·구성으로 슬롯을 노출(연결 여부와 무관).
const PLATFORM_ORDER = ['facebook', 'instagram', 'threads'] as const;
// 카드 표시명 통일: "{국가} {플랫폼}" (예: 한국 페이스북). 채널 자체 name 대신 일관 표기.
const COUNTRY_NAME: Record<string, string> = { ko: '한국', en: '미국', th: '태국', vi: '베트남', ja: '일본', 'zh-tw': '대만', id: '인도네시아' };
const PLATFORM_KO: Record<string, string> = { facebook: '페이스북', instagram: '인스타그램', threads: '스레드', tiktok: '틱톡', website: '웹사이트' };
function channelDisplayName(locale: string, platform: string, fallback: string): string {
  const c = COUNTRY_NAME[locale];
  const p = PLATFORM_KO[platform];
  return c && p ? `${c} ${p}` : fallback;
}

// 공식 브랜드 로고(SVG). 이모지 대신 사용.
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ig-logo-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FED576" />
          <stop offset="26%" stopColor="#F47133" />
          <stop offset="61%" stopColor="#BC3081" />
          <stop offset="100%" stopColor="#4C63D2" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ig-logo-gradient)"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
      />
    </svg>
  );
}
function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#000000" aria-hidden="true">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.36-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.745-1.757-.51-.586-1.297-.884-2.336-.89h-.031c-.834 0-1.965.228-2.686 1.302l-1.736-1.164c.95-1.41 2.497-2.184 4.358-2.184h.046c3.09.018 4.93 1.91 5.115 5.21.106.046.21.093.31.143 1.4.66 2.426 1.658 2.967 2.885.752 1.71.823 4.494-1.45 6.718-1.728 1.69-3.715 2.341-6.401 2.413l-.025-.001z" />
    </svg>
  );
}
function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  if (platform === 'facebook') return <FacebookIcon className={className} />;
  if (platform === 'instagram') return <InstagramIcon className={className} />;
  if (platform === 'threads') return <ThreadsIcon className={className} />;
  return <span className={className}>{platformMeta(platform).icon}</span>;
}

// 같은 페이지의 기존 채널 locale 상속 실패 시 페이지명으로 언어 추론(폴백).
function guessLocale(pageName: string): string {
  const n = pageName.toLowerCase();
  if (n.includes('korea') || n.includes('한국')) return 'ko';
  if (n.includes('thai')) return 'th';
  if (n.includes('viet')) return 'vi';
  if (n.includes('english') || n.includes('america')) return 'en';
  return 'ko';
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
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState<string | null>(null);
  const [localeFilter, setLocaleFilter] = useState<string>('all');
  const visible = localeFilter === 'all' ? channels : channels.filter((c) => c.locale === localeFilter);
  const [meta, setMeta] = useState<MetaConnection>({ connected: false });
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const syncingRef = useRef(false);
  const reloadMeta = () => getMetaConnection().then(setMeta).catch(() => setMeta({ connected: false }));

  const reload = () => {
    fetchChannels().then((cs) => { setChannels(cs); setChannelsLoaded(true); });
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
    localeOverride?: string,
  ) => {
    const locale = localeOverride ?? (localeFilter === 'all' ? 'ko' : localeFilter);
    const igUser = pg.instagram?.username ?? '';
    const handle = platform === 'instagram' || platform === 'threads' ? (igUser ? `@${igUser}` : '') : pg.name;
    const url =
      platform === 'instagram'
        ? (igUser ? `https://instagram.com/${igUser}` : '')
        : platform === 'threads'
          ? (igUser ? `https://www.threads.net/@${igUser}` : '')
          : `https://www.facebook.com/${pg.id}`;
    await saveChannel({
      platform,
      name: platform === 'instagram' ? (igUser || pg.name) : pg.name,
      handle,
      url,
      locale,
      isActive: true,
      metaPageId: pg.id,
      metaIgId: pg.instagram?.id ?? null,
      metaThreadsId: pg.threadsId,
    });
    reload();
  };

  // 연결된 페이지에서 만들 수 있는 채널(FB·IG)을 아래 리스트에 자동 등록한다.
  // (옛 "연결된 페이지에서 채널 추가" 수동 클릭 섹션을 대체 — 리스팅 가능한 건 전부 자동으로 뜬다)
  useEffect(() => {
    if (!channelsLoaded || !meta.connected || !meta.pages?.length || syncingRef.current) return;
    const todo: Array<{ platform: 'facebook' | 'instagram'; pg: NonNullable<MetaConnection['pages']>[number]; locale: string }> = [];
    for (const pg of meta.pages) {
      const existing = channels.filter((c) => c.metaPageId === pg.id);
      const locale = existing[0]?.locale ?? guessLocale(pg.name);
      if (!existing.some((c) => c.platform === 'facebook')) todo.push({ platform: 'facebook', pg, locale });
      if (pg.instagram && !existing.some((c) => c.platform === 'instagram')) todo.push({ platform: 'instagram', pg, locale });
    }
    if (todo.length === 0) return;
    syncingRef.current = true;
    void (async () => {
      for (const t of todo) await addMetaChannel(t.platform, t.pg, t.locale);
      syncingRef.current = false;
    })();
  }, [channelsLoaded, meta.connected, meta.pages, channels]);

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
        <div className="space-y-5">
          {LOCALES.filter((l) => visible.some((c) => c.locale === l.code)).map((l) => {
            const group = visible.filter((c) => c.locale === l.code);
            const connected = PLATFORM_ORDER.filter((p) => group.some((c) => c.platform === p)).length;
            return (
              <div key={l.code}>
                {/* 국가(언어) 섹션 헤더 */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-base leading-none">{l.flag}</span>
                  <span className="text-sm font-bold text-gray-800">{l.label}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">{connected}/{PLATFORM_ORDER.length}</span>
                </div>
                {/* 플랫폼 고정 순서(FB·IG·Threads) 슬롯 — 연결=활성 카드 / 미연결=흐린 점선 */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {PLATFORM_ORDER.map((platform) => {
                    const c = group.find((ch) => ch.platform === platform);
                    const m = platformMeta(platform);
                    const title = channelDisplayName(l.code, platform, c?.name ?? m.label);
                    // 수정 모드
                    if (c && editId === c.id) {
                      return (
                        <div key={platform} className="sm:col-span-3">
                          <ChannelFormRow
                            draft={editDraft}
                            setDraft={setEditDraft}
                            onSubmit={saveEdit}
                            onCancel={() => setEditId(null)}
                            submitLabel="저장"
                          />
                        </div>
                      );
                    }
                    // 미연결 슬롯
                    if (!c) {
                      return (
                        <div
                          key={platform}
                          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-center"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg opacity-40 grayscale" style={{ backgroundColor: m.soft }}>
                            <PlatformIcon platform={platform} className="h-[18px] w-[18px]" />
                          </span>
                          <span className="mt-1.5 text-xs font-semibold text-gray-400">{title}</span>
                          <span className="mt-0.5 text-[11px] text-gray-300">미연결</span>
                        </div>
                      );
                    }
                    // 연결된 채널 (활성 카드)
                    return (
                      <div
                        key={platform}
                        className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                      >
                        <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: m.accent }} />
                        <div className="flex items-center justify-between">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: m.soft }}>
                            <PlatformIcon platform={platform} className="h-[18px] w-[18px]" />
                          </span>
                          <button
                            type="button"
                            aria-label="삭제"
                            onClick={() => remove(c)}
                            className="text-gray-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                          >
                            🗑
                          </button>
                        </div>
                        <div className="mt-2.5">
                          <div className={`truncate text-sm font-bold ${c.isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{title}</div>
                          {c.handle && <div className="truncate text-xs text-gray-400">{c.handle}</div>}
                          {c.note && <div className="mt-0.5 truncate text-[11px] text-gray-400">{c.note}</div>}
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
                          <span className="text-xs text-gray-500">
                            <span className="font-semibold tabular-nums text-gray-700">{c.followers.toLocaleString()}</span> 팔로워
                          </span>
                          <div className="flex items-center gap-2.5 text-xs">
                            {c.url && (
                              <a href={c.url} target="_blank" rel="noreferrer" className="text-[#4A2D6B] hover:underline">
                                링크
                              </a>
                            )}
                            {c.platform === 'youtube' && (
                              <button
                                type="button"
                                onClick={() => sync(c)}
                                disabled={syncing === c.id}
                                className="text-red-600 disabled:opacity-40"
                              >
                                {syncing === c.id ? '동기화중…' : '📊 동기화'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditId(c.id);
                                setEditDraft(c);
                              }}
                              className="text-gray-400 hover:text-[#4A2D6B]"
                            >
                              수정
                            </button>
                          </div>
                        </div>
                        {syncMsg[c.id] && <p className="mt-1.5 text-[11px] text-gray-500">{syncMsg[c.id]}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
