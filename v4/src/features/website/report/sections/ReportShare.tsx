// 리포트 저장·공유 (소비자 선택) — Web Share API(모바일 공유 시트 → 카톡 등 선택) + 링크복사 폴백.
// url = 영구 리포트 링크(/report/r/{token}). 카톡 SDK 없이 MVP. 리포트 상단에 노출.

export function ReportShare({ url }: { url: string }) {
  const onShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: '우리 아이 성장 리포트',
          text: '우리 아이 맞춤 성장 리포트예요.',
          url,
        });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert('링크가 복사되었습니다. 카카오톡 등에 붙여넣어 공유하세요.');
      } else {
        window.prompt('아래 링크를 복사해 공유하세요', url);
      }
    } catch {
      /* 사용자가 공유를 취소함 — 무시 */
    }
  };

  return (
    <section>
      <div
        style={{
          background: 'linear-gradient(135deg,#eef6f2,#f7fbf9)',
          border: '1px solid #d6e8e0',
          borderRadius: 16,
          padding: 16,
          margin: '10px 18px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f6e56' }}>📱 이 리포트 저장하기</div>
        <div style={{ fontSize: 12, color: '#5a5560', margin: '4px 0 12px' }}>
          링크로 언제든 다시 보고, 배우자와 함께 확인하세요.
        </div>
        <button
          type="button"
          onClick={onShare}
          style={{
            width: '100%',
            border: 0,
            borderRadius: 12,
            background: '#0f6e56',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            padding: 12,
            cursor: 'pointer',
          }}
        >
          카카오톡·문자로 공유 · 링크 복사
        </button>
      </div>
    </section>
  );
}
