// 187 성장클리닉 SNS 채널 모음 바텀시트.
// website 의 FloatingButtons 와 환자 앱 BottomNav 양쪽에서 재사용한다.

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const COMMUNITY_LINKS = [
  { name: '유튜브', icon: '🎬', url: 'https://www.youtube.com/@187growup', color: 'bg-red-50 text-red-600 border-red-100' },
  { name: '인스타그램', icon: '📸', url: 'https://www.instagram.com/187growup/', color: 'bg-pink-50 text-pink-600 border-pink-100' },
  { name: '스레드', icon: '🧵', url: 'https://www.threads.com/@187growup', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { name: '블로그', icon: '📝', url: 'https://m.blog.naver.com/saebom2469?tab=1', color: 'bg-green-50 text-green-600 border-green-100' },
];

export function CommunityBottomSheet({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl px-5 pt-6 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">커뮤니티</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3">
          {COMMUNITY_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-4 w-full rounded-2xl border px-5 py-4 active:scale-[0.98] transition-all ${link.color}`}
            >
              <span className="text-2xl">{link.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-base">{link.name}</p>
                <p className="text-xs opacity-60">@187growup</p>
              </div>
              <svg className="w-5 h-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
