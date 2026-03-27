export function WebsiteFooter() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 hidden">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-4 text-center">
        <p className="text-base font-bold text-gray-800">연세새봄의원 187 성장클리닉</p>
        <p className="text-sm text-gray-500">서울특별시 은평구 · 02-3395-0999</p>
        <div className="text-xs text-gray-400 space-y-1">
          <p>월·화·금 09:00~18:30 | 수 11:00~20:30 | 토 09:00~15:30</p>
          <p>점심시간 13:00~14:00 (토 13:30~) | 목·일·공휴일 휴진</p>
        </div>
        <p className="text-xs text-gray-300 pt-4">&copy; 2026 연세새봄의원. All rights reserved.</p>
      </div>
    </footer>
  );
}
