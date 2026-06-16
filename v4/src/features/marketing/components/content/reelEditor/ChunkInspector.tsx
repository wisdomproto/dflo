// 선택 청크 인스펙터 — 나레이션·자막(cap 2줄)·하이라이트(hl)·인서트(인포그래픽 선택)·라벨 값 편집 + 스티커.
// 좌표(x/y)는 캔버스 드래그(Task 13)가 담당 — 여기선 숫자 미노출.
// 텍스트 input 은 CommitInput(blur 커밋)로 undo 스냅샷 보호, 셀렉트/색상/슬라이더는 즉시 onPatch.
import type { ReelAssets, ReelChunk, ReelInsertLabel, ReelLang, ReelRuntimeDoc, ReelStickerAnim, ReelStickerAsset, ReelStickerItem } from '../../../types';
import { chunkTtsDirty } from '../../../utils/reelEditor';
import { CommitInput } from './CommitInput';
import { StickerLibraryPanel } from './StickerLibraryPanel';

interface Props {
  chunk: ReelChunk;
  chunkIdx: number;
  chunkCount: number; // 마지막 청크(CTA 덮음) 판정용
  language: ReelLang;
  reelAssets: ReelAssets;
  runtime: ReelRuntimeDoc | null; // 🎙 dirty 배지(나레이션이 마지막 TTS와 다름) 판정용 — 스트립과 동일 소스
  selectedLabelIdx?: number | null;
  onSelectLabel?: (idx: number) => void;
  onPatch: (patch: Partial<ReelChunk>) => void;
}

const sectionCls = 'rounded-lg border border-gray-200 bg-white p-3';
const labelCls = 'mb-0.5 block text-[11px] font-semibold text-gray-500';
const STICKER_ANIMS: ReelStickerAnim[] = ['none', 'pop', 'float', 'pulse', 'shake'];

export function ChunkInspector({ chunk, chunkIdx, chunkCount, language, reelAssets, runtime, selectedLabelIdx, onSelectLabel, onPatch }: Props) {
  // 나레이션: chunk[lang] = 음성 대본(TTS·립싱크 소스). cap_{lang}(자막)과 별개 필드.
  const narration = typeof chunk[language] === 'string' ? (chunk[language] as string) : '';
  const ttsDirty = chunkTtsDirty(chunk, language, runtime); // 마지막 TTS와 달라 음성 재생성 필요
  const commitNarration = (value: string) => onPatch({ [language]: value });

  // 자막: cap_{lang} = string[] (PresenterShort 가 줄 배열로 읽음). 최대 2줄, 빈 줄 제거 후 저장.
  const capRaw = chunk[`cap_${language}`];
  const cap = Array.isArray(capRaw) ? (capRaw as string[]) : [];
  const hl = typeof chunk[`hl_${language}`] === 'string' ? (chunk[`hl_${language}`] as string) : '';

  const commitCapLine = (idx: 0 | 1, value: string) => {
    const next = [cap[0] ?? '', cap[1] ?? ''];
    next[idx] = value;
    onPatch({ [`cap_${language}`]: next.filter((s) => s.trim() !== '') });
  };
  const commitHl = (value: string) => onPatch({ [`hl_${language}`]: value });

  // 인서트 옵션 — reelAssets.infographics 의 {igKey, url}.
  const igs = Object.entries(reelAssets.infographics ?? {}); // [ [igKey, url], ... ]
  const insert = typeof chunk.insert === 'string' ? chunk.insert : '';
  const labels = Array.isArray(chunk.insertLabels) ? (chunk.insertLabels as ReelInsertLabel[]) : [];

  const onSelectInsert = (url: string) => onPatch({ insert: url || undefined });

  // 라벨 불변 패치 — 현재 언어 텍스트/스타일 한 필드만 갱신.
  const patchLabel = (idx: number, field: keyof ReelInsertLabel | ReelLang, value: string | number | boolean | undefined) => {
    const next = labels.map((l, i) => (i === idx ? { ...l, [field]: value } : l));
    onPatch({ insertLabels: next });
  };
  const removeLabel = (idx: number) => onPatch({ insertLabels: labels.filter((_, i) => i !== idx) });
  const addLabel = () =>
    onPatch({
      insertLabels: [...labels, { x: 0.5, y: 0.5, size: 32, weight: 800, color: '#5b3fa6', [language]: '' }],
    });

  // 스티커: 청크별 stickers 배열. 마지막 청크(CTA 카드가 전체 구간 덮음)·인트로(첫 청크 0~52f 카드 덮음)는
  // 스티커가 카드 아래 레이어라 안 보임 → 추가 비활성 + 안내(StickerLayer 레이어 순서: 인서트 위·카드 아래).
  const stickers = Array.isArray(chunk.stickers) ? (chunk.stickers as ReelStickerItem[]) : [];
  const stickerDisabledReason =
    chunkIdx === chunkCount - 1 ? 'CTA 카드가 전체 구간을 덮어 스티커가 보이지 않아요.'
    : chunkIdx === 0 ? '인트로 카드(처음 약 1.7초)가 덮는 청크라 스티커가 보이지 않아요.'
    : null;

  const addSticker = (a: ReelStickerAsset) =>
    onPatch({
      stickers: [
        ...stickers,
        { id: crypto.randomUUID(), src: a.url, kind: a.kind, x: 0.5, y: 0.3, w: 0.18, rot: 0, fromFrac: 0, durFrac: null, anim: 'pop' },
      ],
    });
  const patchSticker = (idx: number, patch: Partial<ReelStickerItem>) =>
    onPatch({ stickers: stickers.map((s, i) => (i === idx ? { ...s, ...patch } : s)) });
  const removeSticker = (idx: number) => onPatch({ stickers: stickers.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
        ✏️ 청크 편집 — <span style={{ color: '#4A2D6B' }}>{chunk.id}</span> (#{chunkIdx + 1})
        {ttsDirty && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700" title="나레이션이 마지막 음성과 달라 재생성이 필요합니다">
            🎙 재생성 필요
          </span>
        )}
      </div>

      {/* 나레이션(음성 대본) — 자막과 별개. 수정 시 이 언어 음성·립싱크 재생성 필요 */}
      <div className={sectionCls}>
        <div className={labelCls}>나레이션 ({language})</div>
        <CommitInput value={narration} onCommit={commitNarration} placeholder="원장 음성 대본" rows={3} />
        <p className="mt-1 text-[11px] text-amber-700">수정 시 이 언어는 음성·립싱크 재생성(수십 분)이 필요합니다.</p>
      </div>

      {/* 자막 (2줄) + 하이라이트 */}
      <div className={sectionCls}>
        <div className={labelCls}>자막 ({language})</div>
        <div className="space-y-1.5">
          <CommitInput value={cap[0] ?? ''} onCommit={(v) => commitCapLine(0, v)} placeholder="자막 1줄" />
          <CommitInput value={cap[1] ?? ''} onCommit={(v) => commitCapLine(1, v)} placeholder="자막 2줄 (선택)" />
        </div>
        <div className="mt-2">
          <div className={labelCls}>노란 강조 문구</div>
          <CommitInput value={hl} onCommit={commitHl} placeholder="언제까지 클까?" />
          <p className="mt-1 text-[11px] text-gray-400">자막에 포함된 문구만 노랗게 강조됩니다.</p>
        </div>
      </div>

      {/* 인서트(인포그래픽) */}
      <div className={sectionCls}>
        <div className={labelCls}>인서트 (인포그래픽)</div>
        {insert ? (
          <img src={insert} alt="인서트" className="mb-2 max-h-40 rounded border border-gray-200 bg-white object-contain" />
        ) : null}
        <select
          value={insert}
          onChange={(e) => onSelectInsert(e.target.value)}
          className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-[#4A2D6B] focus:outline-none"
        >
          <option value="">없음</option>
          {igs.map(([key, url]) => (
            <option key={key} value={url}>{key}</option>
          ))}
          {/* 현재 insert 가 라이브러리에 없는 경우(예: 직접 시드된 URL)도 선택 유지 */}
          {insert && !igs.some(([, url]) => url === insert) && <option value={insert}>현재 이미지(라이브러리 외)</option>}
        </select>
        {igs.length === 0 && (
          <p className="mt-1 text-[11px] text-gray-400">📋 스토리보드 탭에서 인포그래픽 이미지를 먼저 업로드하세요.</p>
        )}
      </div>

      {/* 라벨 — 인서트 있을 때만 */}
      {insert && (
        <div className={sectionCls}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className={labelCls + ' mb-0'}>라벨 ({labels.length})</span>
            <button type="button" onClick={addLabel} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-200">
              + 라벨
            </button>
          </div>
          {labels.length === 0 ? (
            <p className="text-[11px] text-gray-400">라벨이 없습니다. 위치는 미리보기에서 드래그로 조정해요.</p>
          ) : (
            <div className="space-y-2">
              {labels.map((l, i) => (
                <div
                  key={i}
                  onClick={() => onSelectLabel?.(i)}
                  className={
                    'cursor-pointer rounded p-2 ' +
                    (i === selectedLabelIdx
                      ? 'border-2 border-cyan-400 bg-cyan-50'
                      : 'border border-gray-100 bg-gray-50/60')
                  }
                >
                  <div className="mb-1 flex items-center gap-2">
                    <CommitInput
                      value={typeof l[language] === 'string' ? (l[language] as string) : ''}
                      onCommit={(v) => patchLabel(i, language, v)}
                      placeholder="라벨 텍스트"
                    />
                    <button type="button" onClick={() => removeLabel(i)} className="shrink-0 rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-400 hover:text-red-600">
                      삭제
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      크기
                      <input
                        type="number"
                        value={l.size ?? 32}
                        onChange={(e) => patchLabel(i, 'size', Number(e.target.value) || undefined)}
                        className="w-14 rounded border border-gray-200 px-1 py-0.5 text-[11px] focus:border-[#4A2D6B] focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      폰트
                      <select
                        value={l.font ?? 'kr'}
                        onChange={(e) => patchLabel(i, 'font', e.target.value)}
                        className="rounded border border-gray-200 px-1 py-0.5 text-[11px] focus:border-[#4A2D6B] focus:outline-none"
                      >
                        <option value="kr">한국어</option>
                        <option value="thai">태국어</option>
                        <option value="inter">Inter</option>
                        <option value="sc">간체</option>
                        <option value="tc">번체</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      굵기
                      <select
                        value={l.weight ?? 800}
                        onChange={(e) => patchLabel(i, 'weight', Number(e.target.value))}
                        className="rounded border border-gray-200 px-1 py-0.5 text-[11px] focus:border-[#4A2D6B] focus:outline-none"
                      >
                        <option value={400}>보통</option>
                        <option value={800}>굵게</option>
                        <option value={900}>매우굵게</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      색
                      <input
                        type="color"
                        value={l.color ?? '#5b3fa6'}
                        onChange={(e) => patchLabel(i, 'color', e.target.value)}
                        className="h-5 w-7 cursor-pointer rounded border border-gray-200"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      외각
                      <input
                        type="color"
                        value={l.stroke ?? '#000000'}
                        onChange={(e) => patchLabel(i, 'stroke', e.target.value)}
                        className="h-5 w-7 cursor-pointer rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => patchLabel(i, 'stroke', undefined)}
                        className="rounded border border-gray-200 px-1 text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        없음
                      </button>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      <input
                        type="checkbox"
                        checked={l.shadow ?? !l.pill}
                        onChange={(e) => patchLabel(i, 'shadow', e.target.checked)}
                        className="accent-[#4A2D6B]"
                      />
                      그림자
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      pill 배경
                      <CommitInput
                        value={l.pill ?? ''}
                        onCommit={(v) => patchLabel(i, 'pill', v || undefined)}
                        placeholder="없음"
                        className="w-20 rounded border border-gray-200 px-1 py-0.5 text-[11px] focus:border-[#4A2D6B] focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 스티커 — 청크별. 마지막/인트로 청크는 카드가 덮어 비활성 */}
      <div className={sectionCls}>
        <div className={labelCls + ' mb-1'}>스티커 ({stickers.length})</div>
        {stickerDisabledReason ? (
          <p className="text-[11px] text-amber-700">⚠️ {stickerDisabledReason}</p>
        ) : stickers.length === 0 ? (
          <p className="text-[11px] text-gray-400">아래 라이브러리에서 클릭해 추가하세요. 위치·크기는 미리보기에서 드래그로 조정해요.</p>
        ) : (
          <div className="space-y-2">
            {stickers.map((s, i) => {
              const fromPct = Math.round((s.fromFrac ?? 0) * 100);
              const durIsFull = s.durFrac == null;
              const durPct = durIsFull ? 100 : Math.round((s.durFrac ?? 0) * 100);
              return (
                <div key={s.id} className="rounded border border-gray-100 bg-gray-50/60 p-2">
                  <div className="mb-1.5 flex items-center gap-2">
                    <img src={s.src} alt="스티커" className="h-9 w-9 shrink-0 rounded border border-gray-200 bg-white object-contain" />
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      효과
                      <select
                        value={s.anim}
                        onChange={(e) => patchSticker(i, { anim: e.target.value as ReelStickerAnim })}
                        className="rounded border border-gray-200 px-1 py-0.5 text-[11px] focus:border-[#4A2D6B] focus:outline-none"
                      >
                        {STICKER_ANIMS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      회전°
                      <input
                        type="number" min={-180} max={180} value={s.rot ?? 0}
                        onChange={(e) => patchSticker(i, { rot: Math.max(-180, Math.min(180, Number(e.target.value) || 0)) })}
                        className="w-14 rounded border border-gray-200 px-1 py-0.5 text-[11px] focus:border-[#4A2D6B] focus:outline-none"
                      />
                    </label>
                    {s.kind === 'gif' && <span className="rounded bg-black/60 px-1 text-[9px] font-bold text-white">GIF</span>}
                    <button type="button" onClick={() => removeSticker(i)} className="ml-auto shrink-0 rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-400 hover:text-red-600">
                      삭제
                    </button>
                  </div>
                  {/* 구간 — 청크 길이 대비 % (시작 fromFrac / 길이 durFrac) */}
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="w-8 shrink-0">시작</span>
                      <input
                        type="range" min={0} max={100} value={fromPct}
                        onChange={(e) => patchSticker(i, { fromFrac: Number(e.target.value) / 100 })}
                        className="flex-1 accent-[#4A2D6B]"
                      />
                      <span className="w-9 shrink-0 text-right tabular-nums">{fromPct}%</span>
                    </label>
                    <label className={'flex items-center gap-2 text-[11px] text-gray-500' + (durIsFull ? ' opacity-40' : '')}>
                      <span className="w-8 shrink-0">길이</span>
                      <input
                        type="range" min={5} max={100} value={durPct} disabled={durIsFull}
                        onChange={(e) => patchSticker(i, { durFrac: Number(e.target.value) / 100 })}
                        className="flex-1 accent-[#4A2D6B]"
                      />
                      <span className="w-9 shrink-0 text-right tabular-nums">{durIsFull ? '끝' : `${durPct}%`}</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <input
                        type="checkbox" checked={durIsFull}
                        onChange={(e) => patchSticker(i, { durFrac: e.target.checked ? null : 0.5 })}
                        className="accent-[#4A2D6B]"
                      />
                      청크 끝까지
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 라이브러리 — 비활성 청크에선 onAdd 미전달(클릭 추가 차단) + 사유 안내 */}
      <StickerLibraryPanel onAdd={stickerDisabledReason ? undefined : addSticker} disabledReason={stickerDisabledReason} />
    </div>
  );
}
