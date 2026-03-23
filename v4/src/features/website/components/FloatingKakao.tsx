const KAKAO_URL = import.meta.env.VITE_KAKAO_CHANNEL_URL || 'https://pf.kakao.com/';

export function FloatingKakao() {
  return (
    <a
      href={KAKAO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#FEE500] px-5 py-3
                 shadow-lg shadow-black/10 hover:shadow-xl hover:scale-105 transition-all active:scale-95"
    >
      <span className="text-lg">💬</span>
      <span className="text-sm font-bold text-[#3C1E1E]">카카오톡 상담</span>
    </a>
  );
}
