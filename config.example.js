// ================================================
// 187 성장케어 - 설정 파일 예제
// ================================================
// 
// 📝 사용 방법:
// 1. 이 파일을 복사하여 config.js 생성
// 2. config.js에서 YOUR_XXX 부분을 실제 키로 변경
// 3. config.js는 .gitignore에 추가됨
//
// ================================================

const CONFIG = {
    // Supabase 설정
    SUPABASE_URL: 'https://mufjnulwnppgvibmmbfo.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    
    // 카카오 로그인 설정
    KAKAO_JS_KEY: 'YOUR_KAKAO_JAVASCRIPT_KEY',
    
    // 기타 설정
    APP_NAME: 'LPCare',
    SESSION_KEY: 'growth_care_user',
    CHILDREN_KEY: 'growth_care_children'
};

// 전역으로 노출
window.CONFIG = CONFIG;

console.log('✅ 설정 파일 로드 완료');
