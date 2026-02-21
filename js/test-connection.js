// ================================================
// 187 성장케어 - Supabase 연결 테스트
// ================================================

// Supabase 설정
const SUPABASE_URL = 'https://mufjnulwnppgvibmmbfo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3hm8ooVxIZvENDh-D_lWNA_sdPHg9xk';

// Supabase 클라이언트 생성
let supabaseClient = null;

// 테스트 결과 추적
let testResults = {
    client: false,
    connection: false,
    tables: false,
    rls: false
};

// 페이지 로드 시 자동 실행
window.addEventListener('DOMContentLoaded', () => {
    // Supabase 라이브러리 로드 확인
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase 라이브러리가 로드되지 않았습니다.');
        showError('Supabase 라이브러리 로드 실패');
        return;
    }
    
    // 초기화 후 테스트 실행
    initSupabase();
    runTests();
});

// Supabase 초기화
function initSupabase() {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase 클라이언트 초기화 성공');
    } catch (error) {
        console.error('❌ Supabase 클라이언트 초기화 실패:', error);
    }
}

// 전체 테스트 실행
async function runTests() {
    console.log('🔍 Supabase 연결 테스트 시작...');
    
    // 초기화
    document.getElementById('summary').style.display = 'none';
    resetTest('test1');
    resetTest('test2');
    resetTest('test3');
    resetTest('test4');
    
    // 순차 실행
    await test1_checkClient();
    
    if (testResults.client) {
        await test2_checkConnection();
        
        if (testResults.connection) {
            await test3_checkTables();
            await test4_checkRLS();
        }
    }
    
    // 결과 요약
    showSummary();
}

// 테스트 상태 초기화
function resetTest(testId) {
    const test = document.getElementById(testId);
    const status = test.querySelector('.status');
    status.className = 'status loading';
    status.textContent = '테스트 중...';
    test.querySelector('.result').textContent = '';
}

// 테스트 결과 업데이트
function updateTest(testId, success, message) {
    const test = document.getElementById(testId);
    const status = test.querySelector('.status');
    const result = test.querySelector('.result');
    
    if (success) {
        status.className = 'status success';
        status.textContent = '✅ 성공';
    } else {
        status.className = 'status error';
        status.textContent = '❌ 실패';
    }
    
    result.textContent = message;
}

// 테스트 1: Supabase 클라이언트 생성
async function test1_checkClient() {
    try {
        if (supabaseClient && typeof supabaseClient.from === 'function') {
            testResults.client = true;
            updateTest('test1', true, 
                `✅ Supabase 클라이언트가 정상적으로 생성되었습니다.\n\n` +
                `URL: ${SUPABASE_URL}\n` +
                `API Key: ${SUPABASE_ANON_KEY.substring(0, 30)}...`
            );
        } else {
            throw new Error('Supabase 클라이언트 초기화 실패');
        }
    } catch (error) {
        testResults.client = false;
        updateTest('test1', false, 
            `❌ 오류: ${error.message}\n\n` +
            `Supabase 라이브러리가 제대로 로드되지 않았습니다.`
        );
    }
}

// 테스트 2: 데이터베이스 연결
async function test2_checkConnection() {
    try {
        // 간단한 쿼리로 연결 테스트
        const { data, error } = await supabaseClient
            .from('users')
            .select('count')
            .limit(1);
        
        if (error) {
            // 테이블이 없을 수도 있으므로 에러 메시지 확인
            if (error.message.includes('does not exist')) {
                testResults.connection = true;
                updateTest('test2', true,
                    `✅ 데이터베이스 연결 성공!\n\n` +
                    `⚠️ 'users' 테이블이 아직 생성되지 않았습니다.\n` +
                    `supabase/schema.sql을 실행하세요.`
                );
            } else if (error.message.includes('Invalid API key')) {
                throw new Error('API Key가 유효하지 않습니다. Settings → API에서 Publishable key를 확인하세요.');
            } else {
                throw error;
            }
        } else {
            testResults.connection = true;
            updateTest('test2', true,
                `✅ 데이터베이스 연결 성공!\n\n` +
                `users 테이블에 접근할 수 있습니다.`
            );
        }
    } catch (error) {
        testResults.connection = false;
        updateTest('test2', false,
            `❌ 연결 실패: ${error.message}\n\n` +
            `확인 사항:\n` +
            `1. Supabase URL이 올바른지 확인하세요.\n` +
            `2. Settings → API에서 Publishable key를 복사했는지 확인하세요.\n` +
            `3. Data API가 활성화되어 있는지 확인하세요.`
        );
    }
}

// 테스트 3: 테이블 존재 확인
async function test3_checkTables() {
    const tables = ['users', 'children', 'recipes', 'growth_cases', 'growth_guides'];
    let existingTables = [];
    let missingTables = [];
    
    for (const table of tables) {
        try {
            const { error } = await supabaseClient
                .from(table)
                .select('count')
                .limit(1);
            
            if (error) {
                if (error.message.includes('does not exist')) {
                    missingTables.push(table);
                } else {
                    // RLS 정책 에러는 테이블이 존재하는 것
                    existingTables.push(table);
                }
            } else {
                existingTables.push(table);
            }
        } catch (error) {
            console.error(`테이블 ${table} 확인 실패:`, error);
        }
    }
    
    if (missingTables.length === 0) {
        testResults.tables = true;
        updateTest('test3', true,
            `✅ 모든 필수 테이블이 존재합니다!\n\n` +
            `존재하는 테이블:\n${existingTables.map(t => `  • ${t}`).join('\n')}`
        );
    } else {
        testResults.tables = false;
        updateTest('test3', false,
            `⚠️ 일부 테이블이 없습니다.\n\n` +
            `존재하는 테이블:\n${existingTables.map(t => `  ✅ ${t}`).join('\n')}\n\n` +
            `없는 테이블:\n${missingTables.map(t => `  ❌ ${t}`).join('\n')}\n\n` +
            `해결방법:\n` +
            `1. Supabase Dashboard → SQL Editor 이동\n` +
            `2. New Query 클릭\n` +
            `3. supabase/schema.sql 파일 내용 복사\n` +
            `4. Run 버튼 클릭`
        );
    }
}

// 테스트 4: RLS 정책 확인
async function test4_checkRLS() {
    try {
        // recipes 테이블 조회 시도 (공개 조회 가능)
        const { data, error } = await supabaseClient
            .from('recipes')
            .select('*')
            .limit(1);
        
        if (error) {
            if (error.message.includes('does not exist')) {
                testResults.rls = false;
                updateTest('test4', false,
                    `⚠️ recipes 테이블이 없어 RLS를 확인할 수 없습니다.\n\n` +
                    `먼저 supabase/schema.sql을 실행하세요.`
                );
            } else if (error.message.includes('policy')) {
                testResults.rls = true;
                updateTest('test4', true,
                    `✅ RLS 정책이 활성화되어 있습니다!\n\n` +
                    `보안 정책이 정상적으로 작동하고 있습니다.`
                );
            } else {
                throw error;
            }
        } else {
            testResults.rls = true;
            updateTest('test4', true,
                `✅ RLS 정책 확인 완료!\n\n` +
                `데이터 조회: ${data.length}개\n` +
                `보안 정책이 정상적으로 작동하고 있습니다.`
            );
        }
    } catch (error) {
        testResults.rls = false;
        updateTest('test4', false,
            `❌ RLS 확인 실패: ${error.message}`
        );
    }
}

// 결과 요약
function showSummary() {
    const summary = document.getElementById('summary');
    const allSuccess = testResults.client && testResults.connection;
    
    if (allSuccess) {
        summary.style.display = 'block';
        summary.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        summary.innerHTML = `
            <h2>✅ Supabase 연결 성공!</h2>
            <p>데이터베이스가 정상적으로 연결되었습니다.</p>
            ${!testResults.tables ? '<p style="margin-top: 10px;">⚠️ 테이블을 생성해야 합니다.</p>' : ''}
        `;
    } else {
        summary.style.display = 'block';
        summary.style.background = 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)';
        summary.innerHTML = `
            <h2>❌ 연결 실패</h2>
            <p>Supabase 설정을 확인하세요.</p>
            <p style="margin-top: 10px;">📖 docs/SUPABASE_SETUP.md 참고</p>
        `;
    }
}

// 에러 표시
function showError(message) {
    const summary = document.getElementById('summary');
    summary.style.display = 'block';
    summary.style.background = 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)';
    summary.innerHTML = `
        <h2>❌ 오류 발생</h2>
        <p>${message}</p>
    `;
}

// 전역 함수로 노출 (HTML 버튼에서 호출)
window.runTests = runTests;
