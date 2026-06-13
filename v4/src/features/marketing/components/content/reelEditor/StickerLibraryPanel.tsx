// 스티커 라이브러리 — 인스펙터 하단 아코디언. 검색 + 카테고리 탭(스티커/이모지) + 썸네일 그리드 + 업로드.
// 업로드는 ImageDropzone(InfographicAssetsPanel UX) 재사용 — upload 는 반드시 무변환 경로(createSticker→uploadStickerFile).
//   기본 uploadImageFile 은 canvas→WebP 변환이라 GIF 가 정지 1프레임이 되어 'gif' 렌더가 깨짐 → 절대 사용 금지.
// 항목 클릭 → onAdd(asset). fetch/insert 실패는 서비스가 "migration 057" 안내로 변환.
import { useEffect, useRef, useState } from 'react';
import type { ReelStickerAsset } from '../../../types';
import { createSticker, deleteSticker, fetchStickers } from '../../../services/reelStickerService';
import { ImageDropzone } from '../ImageDropzone';

const ACCENT = '#4A2D6B';
type Cat = 'sticker' | 'emoji';

interface Props {
  /** 라이브러리 항목 클릭 → 청크에 스티커 추가 (비활성 시 미전달). */
  onAdd?: (asset: ReelStickerAsset) => void;
  /** 추가 비활성(마지막 청크/인트로) 사유 — 그리드는 보이되 클릭 추가만 막고 안내. */
  disabledReason?: string | null;
}

export function StickerLibraryPanel({ onAdd, disabledReason }: Props) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<Cat>('sticker');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ReelStickerAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // ImageDropzone 의 upload(file)→url 사이에 생성된 asset 을 onUploaded 로 넘기기 위한 임시 보관.
  const pendingRef = useRef<ReelStickerAsset | null>(null);

  const load = () => {
    setLoading(true);
    setErr(null);
    void fetchStickers(cat)
      .then(setItems)
      .catch((e) => setErr(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false));
  };
  // 아코디언 펼침 + 카테고리 전환 시 로드.
  useEffect(() => {
    if (open) load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open, cat]);

  // createSticker = uploadStickerFile(무변환) + kind 판정 + DB insert. 반환 url 을 ImageDropzone 미리보기에 전달.
  const upload = async (file: File): Promise<string> => {
    const created = await createSticker({ name: file.name.replace(/\.[^.]+$/, '') || '스티커', category: cat, file });
    pendingRef.current = created;
    return created.url;
  };
  const onUploaded = () => {
    const created = pendingRef.current;
    pendingRef.current = null;
    if (created) setItems((prev) => [created, ...prev]); // 낙관적 prepend(서버 created_at desc 와 동일 순서)
  };

  const onDelete = (id: string) => {
    setItems((prev) => prev.filter((s) => s.id !== id)); // 낙관적 제거 — R2 객체는 남김(릴에 박힌 src 보호)
    void deleteSticker(id).catch((e) => { setErr(e instanceof Error ? e.message : '삭제 실패'); load(); });
  };

  const filtered = q.trim()
    ? items.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()))
    : items;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600"
      >
        <span>🩷 스티커 라이브러리</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-gray-100 p-3">
          {disabledReason && (
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700">{disabledReason}</div>
          )}

          {/* 카테고리 탭 */}
          <div className="flex gap-1">
            {(['sticker', 'emoji'] as Cat[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={
                  'flex-1 rounded px-2 py-1 text-[11px] font-semibold transition ' +
                  (cat === c ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')
                }
                style={cat === c ? { backgroundColor: ACCENT } : undefined}
              >
                {c === 'sticker' ? '스티커' : '이모지'}
              </button>
            ))}
          </div>

          {/* 검색 */}
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름으로 검색"
            className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-[#4A2D6B] focus:outline-none"
          />

          {/* 업로드 (드래그앤드롭 / 파일선택 — 클립보드 붙여넣기는 PNG 재인코딩으로 GIF 애니 소실되므로 미사용) */}
          <ImageDropzone
            url={null}
            alt="새 스티커"
            aspectRatio="1 / 1"
            upload={upload}
            showFilePicker
            placeholder="🩷 스티커 드롭 / 파일 선택"
            onUploaded={onUploaded}
          />
          <p className="text-[11px] text-gray-400">
            GIF 는 드래그앤드롭 / 파일 선택으로 올려주세요 (클립보드 붙여넣기는 PNG 로 재인코딩돼 애니메이션이 사라집니다).
          </p>

          {err && <div className="text-[11px] text-red-600">{err}</div>}

          {/* 썸네일 그리드 */}
          {loading ? (
            <div className="py-4 text-center text-[11px] text-gray-400">불러오는 중…</div>
          ) : filtered.length === 0 ? (
            <div className="py-4 text-center text-[11px] text-gray-400">
              {q.trim() ? '검색 결과 없음' : '아직 스티커가 없어요 — 위에서 업로드하세요.'}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {filtered.map((s) => (
                <div key={s.id} className="group relative">
                  <button
                    type="button"
                    disabled={!onAdd}
                    onClick={() => onAdd?.(s)}
                    title={onAdd ? `${s.name} 추가` : (disabledReason ?? '추가할 수 없는 청크')}
                    className={
                      'flex aspect-square w-full items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50 transition ' +
                      (onAdd ? 'cursor-pointer hover:border-[#4A2D6B] hover:ring-2 hover:ring-[#4A2D6B]/20' : 'cursor-not-allowed opacity-50')
                    }
                  >
                    <img src={s.url} alt={s.name} className="h-full w-full object-contain" />
                  </button>
                  {s.kind === 'gif' && (
                    <span className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[8px] font-bold text-white">GIF</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(s.id)}
                    title="라이브러리에서 제거"
                    className="absolute right-0.5 top-0.5 hidden rounded-full bg-black/60 px-1.5 text-[10px] leading-tight text-white group-hover:block"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
