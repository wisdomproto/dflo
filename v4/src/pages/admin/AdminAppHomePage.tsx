// ================================================
// AdminAppHomePage - 187 성장케어 v4
// 환자 앱(/app) 홈 화면용 섹션 관리자.
// website(병원 홈)와 같은 편집 UI(AdminWebsitePage)를 쓰지만
// R2 저장 키는 'app-home.json'으로 분리되어 있다.
// 처음 진입 시 'app-home.json'이 없으면 'website.json' 내용을
// 보여주고, 저장하면 그 시점부터 'app-home.json'으로 분리 저장된다.
// 이미지 자체는 두 페이지가 같은 R2 URL을 공유한다.
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
