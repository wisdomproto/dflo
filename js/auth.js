// ================================================
// 187 성장케어 - 인증 시스템
// ================================================

// 세션 키
const SESSION_KEY = 'growth_care_user';

// ================================================
// 로그인 함수
// ================================================

/**
 * 이메일과 비밀번호로 로그인
 */
async function login(email, password) {
    try {
        // 1단계: 이메일로 사용자 찾기
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', email);

        if (error) {
            throw error;
        }

        if (!users || users.length === 0) {
            return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
        }

        // 2단계: 비밀번호 확인 (클라이언트 측)
        const user = users[0];
        if (user.password !== password) {
            return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
        }

        // 3단계: 세션에 저장 (비밀번호 제외)
        const sessionUser = { ...user };
        delete sessionUser.password; // 보안을 위해 세션에서 비밀번호 제거
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
        
        return { success: true, user: sessionUser };
    } catch (error) {
        console.error('로그인 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 로그아웃
 */
function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
}

/**
 * 현재 로그인한 사용자 가져오기
 */
function getCurrentUser() {
    const userJson = sessionStorage.getItem(SESSION_KEY);
    if (!userJson) return null;
    
    try {
        return JSON.parse(userJson);
    } catch (error) {
        console.error('사용자 정보 파싱 실패:', error);
        return null;
    }
}

/**
 * 로그인 여부 확인
 */
function isLoggedIn() {
    return getCurrentUser() !== null;
}

/**
 * 관리자 권한 확인
 */
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

/**
 * 의사 권한 확인
 */
function isDoctor() {
    const user = getCurrentUser();
    return user && (user.role === 'doctor' || user.role === 'admin');
}

/**
 * 부모 권한 확인
 */
function isParent() {
    const user = getCurrentUser();
    return user && user.role === 'parent';
}

/**
 * 페이지 접근 권한 확인 (보호된 페이지에서 사용)
 */
function requireAuth(requiredRole = null) {
    if (!isLoggedIn()) {
        // 로그인하지 않은 경우
        window.location.href = 'login.html';
        return false;
    }

    const user = getCurrentUser();
    
    // 특정 역할이 필요한 경우
    if (requiredRole) {
        if (Array.isArray(requiredRole)) {
            // 여러 역할 중 하나
            if (!requiredRole.includes(user.role)) {
                alert('접근 권한이 없습니다.');
                window.location.href = 'index.html';
                return false;
            }
        } else {
            // 단일 역할
            if (user.role !== requiredRole) {
                alert('접근 권한이 없습니다.');
                window.location.href = 'index.html';
                return false;
            }
        }
    }

    return true;
}

/**
 * 비밀번호 변경
 */
async function changePassword(currentPassword, newPassword) {
    try {
        const user = getCurrentUser();
        if (!user) {
            return { success: false, error: '로그인이 필요합니다.' };
        }

        // 현재 비밀번호 확인
        const { data: verifyUser, error: verifyError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', user.id)
            .eq('password', currentPassword)
            .single();

        if (verifyError || !verifyUser) {
            return { success: false, error: '현재 비밀번호가 올바르지 않습니다.' };
        }

        // 새 비밀번호로 업데이트
        const { error: updateError } = await supabaseClient
            .from('users')
            .update({ password: newPassword })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // 세션 정보 업데이트
        user.password = newPassword;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));

        return { success: true };
    } catch (error) {
        console.error('비밀번호 변경 실패:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// 초기화
// ================================================
console.log('✅ 인증 시스템 로드 완료');
