
// ================================================
// 로그아웃 함수 추가
// ================================================

/**
 * 로그아웃
 */
function logout() {
    const SESSION_KEY = 'growth_care_user';
    const CHILDREN_KEY = 'growth_care_children';
    
    // 세션 스토리지 정리
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(CHILDREN_KEY);
    
    // 로컬 스토리지 정리 (선택 사항)
    // localStorage.clear();
    
    // 로그인 페이지로 이동
    window.location.href = 'index.html';
}

// 전역 함수로 노출
window.logout = logout;

console.log('✅ logout 함수 로드 완료');
