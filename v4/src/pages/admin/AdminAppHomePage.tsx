// ================================================
// AdminAppHomePage - 187 성장케어 v4
// 환자 앱(/app) 홈 화면용 섹션 관리자.
// website(병원 홈)와 같은 편집 UI(AdminWebsitePage)를 쓰지만
// R2 저장 키는 'app-home.json'으로 분리되어 있다.
// 섹션별 노출 여부는 AdminEditorPanel 의 섹션 옵션 영역 (👁️ 노출 중/🙈 숨김)
// 에서 직접 토글한다.
// ================================================

import AdminWebsitePage from '@/features/website/pages/AdminWebsitePage';

export default function AdminAppHomePage() {
  return (
    <AdminWebsitePage
      storageKey="app-home.json"
      fallbackKey="website.json"
      headerTitle="앱 홈 콘텐츠"
      homeLinkText="앱으로 가기"
      homeLinkPath="/app"
    />
  );
}
