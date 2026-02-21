// ================================================
// 187 성장케어 - Supabase 설정
// ================================================
// Supabase 프로젝트 생성 후 아래 값을 수정하세요
// ================================================

// ⚠️ TODO: Supabase Dashboard에서 다음 값을 복사하세요
// 1. https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
// 2. Project URL → SUPABASE_URL에 복사
// 3. Project API keys → anon public → SUPABASE_ANON_KEY에 복사

const SUPABASE_URL = 'https://mufjnulwnppgvibmmbfo.supabase.co'; // 예: https://abcdefghijklmno.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_3hm8ooVxIZvENDh-D_lWNA_sdPHg9xk'; // anon public key

// Supabase 클라이언트 생성
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================================
// 유틸리티 함수
// ================================================

/**
 * 현재 로그인한 사용자 정보 가져오기
 */
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
        return null;
    }
}

/**
 * 사용자 역할 확인
 */
async function getUserRole() {
    try {
        const user = await getCurrentUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (error) throw error;
        return data?.role || null;
    } catch (error) {
        console.error('사용자 역할 확인 실패:', error);
        return null;
    }
}

/**
 * 관리자 권한 확인
 */
async function isAdmin() {
    const role = await getUserRole();
    return role === 'admin';
}

/**
 * 의사 권한 확인
 */
async function isDoctor() {
    const role = await getUserRole();
    return role === 'doctor' || role === 'admin';
}

// ================================================
// API 함수: 레시피 (Recipes)
// ================================================

/**
 * 레시피 목록 가져오기
 */
async function getRecipes(limit = 10, offset = 0) {
    try {
        const { data, error, count } = await supabase
            .from('recipes')
            .select('*', { count: 'exact' })
            .eq('is_published', true)
            .order('order_index', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { recipes: data, total: count };
    } catch (error) {
        console.error('레시피 목록 가져오기 실패:', error);
        return { recipes: [], total: 0 };
    }
}

/**
 * 특정 레시피 가져오기
 */
async function getRecipe(id) {
    try {
        const { data, error } = await supabase
            .from('recipes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('레시피 가져오기 실패:', error);
        return null;
    }
}

/**
 * 레시피 추가 (관리자만)
 */
async function createRecipe(recipeData) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('로그인이 필요합니다');

        const { data, error } = await supabase
            .from('recipes')
            .insert({
                ...recipeData,
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('레시피 추가 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 레시피 수정 (관리자만)
 */
async function updateRecipe(id, recipeData) {
    try {
        const { data, error } = await supabase
            .from('recipes')
            .update(recipeData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('레시피 수정 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 레시피 삭제 (관리자만)
 */
async function deleteRecipe(id) {
    try {
        const { error } = await supabase
            .from('recipes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('레시피 삭제 실패:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// API 함수: 성장 관리 사례 (Growth Cases)
// ================================================

/**
 * 사례 목록 가져오기
 */
async function getGrowthCases(limit = 9, offset = 0) {
    try {
        const { data, error, count } = await supabase
            .from('growth_cases')
            .select('*', { count: 'exact' })
            .eq('is_published', true)
            .order('order_index', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { cases: data, total: count };
    } catch (error) {
        console.error('사례 목록 가져오기 실패:', error);
        return { cases: [], total: 0 };
    }
}

/**
 * 특정 사례 가져오기
 */
async function getGrowthCase(id) {
    try {
        const { data, error } = await supabase
            .from('growth_cases')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('사례 가져오기 실패:', error);
        return null;
    }
}

/**
 * 사례 추가 (관리자만)
 */
async function createGrowthCase(caseData) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('로그인이 필요합니다');

        const { data, error } = await supabase
            .from('growth_cases')
            .insert({
                ...caseData,
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('사례 추가 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 사례 수정 (관리자만)
 */
async function updateGrowthCase(id, caseData) {
    try {
        const { data, error } = await supabase
            .from('growth_cases')
            .update(caseData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('사례 수정 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 사례 삭제 (관리자만)
 */
async function deleteGrowthCase(id) {
    try {
        const { error } = await supabase
            .from('growth_cases')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('사례 삭제 실패:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// API 함수: 성장 가이드 (Growth Guides)
// ================================================

/**
 * 가이드 목록 가져오기
 */
async function getGrowthGuides(limit = 10, offset = 0) {
    try {
        const { data, error, count } = await supabase
            .from('growth_guides')
            .select('*', { count: 'exact' })
            .eq('is_published', true)
            .order('order_index', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { guides: data, total: count };
    } catch (error) {
        console.error('가이드 목록 가져오기 실패:', error);
        return { guides: [], total: 0 };
    }
}

/**
 * 가이드 추가 (관리자만)
 */
async function createGrowthGuide(guideData) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('로그인이 필요합니다');

        const { data, error } = await supabase
            .from('growth_guides')
            .insert({
                ...guideData,
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('가이드 추가 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 가이드 수정 (관리자만)
 */
async function updateGrowthGuide(id, guideData) {
    try {
        const { data, error } = await supabase
            .from('growth_guides')
            .update(guideData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('가이드 수정 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 가이드 삭제 (관리자만)
 */
async function deleteGrowthGuide(id) {
    try {
        const { error } = await supabase
            .from('growth_guides')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('가이드 삭제 실패:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// API 함수: 아이 정보 (Children)
// ================================================

/**
 * 내 아이 목록 가져오기
 */
async function getMyChildren() {
    try {
        const user = await getCurrentUser();
        if (!user) return { children: [] };

        const { data, error } = await supabase
            .from('children')
            .select('*')
            .eq('parent_id', user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { children: data || [] };
    } catch (error) {
        console.error('아이 목록 가져오기 실패:', error);
        return { children: [] };
    }
}

/**
 * 아이 추가
 */
async function createChild(childData) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('로그인이 필요합니다');

        const { data, error } = await supabase
            .from('children')
            .insert({
                ...childData,
                parent_id: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('아이 추가 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 아이 정보 수정
 */
async function updateChild(id, childData) {
    try {
        const { data, error } = await supabase
            .from('children')
            .update(childData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('아이 정보 수정 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 아이 삭제
 */
async function deleteChild(id) {
    try {
        const { error } = await supabase
            .from('children')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('아이 삭제 실패:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// API 함수: 성장 기록 (Measurements)
// ================================================

/**
 * 아이의 측정 기록 가져오기
 */
async function getChildMeasurements(childId) {
    try {
        const { data, error } = await supabase
            .from('measurements')
            .select('*')
            .eq('child_id', childId)
            .order('measured_date', { ascending: true });

        if (error) throw error;
        return { measurements: data || [] };
    } catch (error) {
        console.error('측정 기록 가져오기 실패:', error);
        return { measurements: [] };
    }
}

/**
 * 측정 기록 추가
 */
async function createMeasurement(measurementData) {
    try {
        const { data, error } = await supabase
            .from('measurements')
            .insert(measurementData)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('측정 기록 추가 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 측정 기록 삭제
 */
async function deleteMeasurement(id) {
    try {
        const { error } = await supabase
            .from('measurements')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('측정 기록 삭제 실패:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// 실시간 구독 (Realtime Subscriptions)
// ================================================

/**
 * 레시피 실시간 구독
 */
function subscribeToRecipes(callback) {
    return supabase
        .channel('recipes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'recipes' },
            callback
        )
        .subscribe();
}

/**
 * 사례 실시간 구독
 */
function subscribeToGrowthCases(callback) {
    return supabase
        .channel('growth_cases')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'growth_cases' },
            callback
        )
        .subscribe();
}

/**
 * 가이드 실시간 구독
 */
function subscribeToGrowthGuides(callback) {
    return supabase
        .channel('growth_guides')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'growth_guides' },
            callback
        )
        .subscribe();
}

// ================================================
// 초기화 확인
// ================================================
console.log('✅ Supabase 설정 로드 완료');
if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.warn('⚠️ Supabase URL과 ANON KEY를 설정하세요!');
    console.warn('📖 docs/SUPABASE_SETUP.md 참고');
}
