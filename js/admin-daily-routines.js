// ================================================
// 데일리 루틴 관리 (관리자용)
// ================================================

/**
 * 특정 아이의 모든 데일리 루틴 로드 및 표시
 * @param {string} childId - 아이 ID
 */
async function loadDailyRoutines(childId) {
    console.log(`📅 [관리자] 데일리 루틴 로드 시작: ${childId}`);
    
    const container = document.getElementById(`dailyRoutines_${childId}`);
    if (!container) {
        console.error('데일리 루틴 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    container.innerHTML = '<div class="loading" style="padding: 20px; text-align: center;">⏳ 데이터를 불러오는 중...</div>';
    
    try {
        // Supabase에서 데일리 루틴 가져오기
        const { data: routines, error } = await supabase
            .from('daily_routines')
            .select('*')
            .eq('child_id', childId)
            .order('routine_date', { ascending: false });
        
        if (error) throw error;
        
        console.log(`✅ [관리자] ${routines.length}개 데일리 루틴 로드 완료`);
        
        if (!routines || routines.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <div class="empty-state-icon">📅</div>
                    <div class="empty-state-text">등록된 데일리 루틴이 없습니다</div>
                </div>
            `;
            return;
        }
        
        // 데일리 루틴 렌더링
        renderDailyRoutines(container, routines);
        
    } catch (error) {
        console.error('데일리 루틴 로드 실패:', error);
        container.innerHTML = `
            <div class="error-state-small">
                <p style="color: #e53e3e; font-size: 0.9rem;">❌ 데일리 루틴을 불러오는데 실패했습니다</p>
                <p style="color: #9ca3af; font-size: 0.85rem;">${error.message}</p>
            </div>
        `;
    }
}

/**
 * 데일리 루틴 렌더링
 * @param {HTMLElement} container - 렌더링할 컨테이너
 * @param {Array} routines - 데일리 루틴 배열
 */
function renderDailyRoutines(container, routines) {
    const html = `
        <div class="daily-routines-table-wrapper">
            <table class="daily-routines-table">
                <thead>
                    <tr>
                        <th>날짜</th>
                        <th>키(cm)</th>
                        <th>몸무게(kg)</th>
                        <th>수면</th>
                        <th>수분(ml)</th>
                        <th>식사</th>
                        <th>운동</th>
                        <th>영양제</th>
                        <th>성장주사</th>
                        <th>기분</th>
                        <th>상세</th>
                    </tr>
                </thead>
                <tbody>
                    ${routines.map(routine => renderRoutineRow(routine)).join('')}
                </tbody>
            </table>
        </div>
        
        <style>
            .daily-routines-table-wrapper {
                overflow-x: auto;
                margin-top: 16px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }
            
            .daily-routines-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.85rem;
                background: white;
            }
            
            .daily-routines-table thead {
                background: #f8fafc;
            }
            
            .daily-routines-table th {
                padding: 10px 8px;
                text-align: left;
                font-weight: 600;
                color: #475569;
                border-bottom: 2px solid #e2e8f0;
                white-space: nowrap;
            }
            
            .daily-routines-table td {
                padding: 10px 8px;
                border-bottom: 1px solid #f1f5f9;
                color: #1e293b;
            }
            
            .daily-routines-table tbody tr:hover {
                background: #f8fafc;
            }
            
            .routine-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 500;
                margin: 2px;
            }
            
            .routine-badge.yes {
                background: #dcfce7;
                color: #166534;
            }
            
            .routine-badge.no {
                background: #fee2e2;
                color: #991b1b;
            }
            
            .routine-badge.neutral {
                background: #f1f5f9;
                color: #64748b;
            }
            
            .btn-view-routine {
                padding: 4px 12px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-view-routine:hover {
                background: #5568d3;
                transform: translateY(-1px);
            }
            
            .empty-state-small {
                padding: 40px 20px;
                text-align: center;
            }
            
            .empty-state-small .empty-state-icon {
                font-size: 3rem;
                margin-bottom: 12px;
            }
            
            .empty-state-small .empty-state-text {
                color: #9ca3af;
                font-size: 0.9rem;
            }
            
            .error-state-small {
                padding: 20px;
                text-align: center;
            }
        </style>
    `;
    
    container.innerHTML = html;
}

/**
 * 단일 루틴 행 렌더링
 * @param {Object} routine - 데일리 루틴 객체
 * @returns {string} HTML 문자열
 */
function renderRoutineRow(routine) {
    // 수면 시간 계산
    const sleepInfo = calculateSleepHours(routine.sleep_time, routine.wake_time);
    
    // 식사 개수
    const mealCount = routine.meals ? routine.meals.length : 0;
    
    // 운동 개수
    const exerciseCount = routine.exercises ? routine.exercises.length : 0;
    
    // 영양제 개수
    const supplementCount = routine.supplements ? routine.supplements.length : 0;
    
    // 성장 주사 여부
    const injection = routine.growth_injection ? '✅ 투여' : '-';
    
    // 기분
    const mood = routine.mood || '-';
    
    return `
        <tr>
            <td><strong>${formatDateKR(routine.routine_date)}</strong></td>
            <td>${routine.height ? routine.height.toFixed(1) : '-'}</td>
            <td>${routine.weight ? routine.weight.toFixed(1) : '-'}</td>
            <td>${sleepInfo}</td>
            <td>${routine.water_amount || '-'}</td>
            <td>
                ${mealCount > 0 ? `<span class="routine-badge yes">${mealCount}끼</span>` : '<span class="routine-badge neutral">-</span>'}
            </td>
            <td>
                ${exerciseCount > 0 ? `<span class="routine-badge yes">${exerciseCount}개</span>` : '<span class="routine-badge neutral">-</span>'}
            </td>
            <td>
                ${supplementCount > 0 ? `<span class="routine-badge yes">${supplementCount}개</span>` : '<span class="routine-badge neutral">-</span>'}
            </td>
            <td>${injection}</td>
            <td>${mood}</td>
            <td>
                <button class="btn-view-routine" onclick="showRoutineDetail('${routine.id}')">
                    👁️ 보기
                </button>
            </td>
        </tr>
    `;
}

/**
 * 수면 시간 계산
 * @param {string} sleepTime - 취침 시간
 * @param {string} wakeTime - 기상 시간
 * @returns {string} 수면 시간 문자열
 */
function calculateSleepHours(sleepTime, wakeTime) {
    if (!sleepTime || !wakeTime) return '-';
    
    try {
        const sleep = new Date(`2000-01-01T${sleepTime}`);
        let wake = new Date(`2000-01-01T${wakeTime}`);
        
        // 기상 시간이 취침 시간보다 이르면 다음날로 간주
        if (wake < sleep) {
            wake = new Date(`2000-01-02T${wakeTime}`);
        }
        
        const diffMs = wake - sleep;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        return `${diffHours.toFixed(1)}시간`;
    } catch (error) {
        return '-';
    }
}

/**
 * 날짜 포맷 (YYYY-MM-DD → YYYY.MM.DD)
 * @param {string} dateStr - 날짜 문자열
 * @returns {string} 포맷된 날짜
 */
function formatDateKR(dateStr) {
    if (!dateStr) return '-';
    return dateStr.replace(/-/g, '.');
}

/**
 * 루틴 상세 모달 표시
 * @param {string} routineId - 루틴 ID
 */
async function showRoutineDetail(routineId) {
    console.log(`📋 루틴 상세 보기: ${routineId}`);
    
    try {
        const { data: routine, error } = await supabase
            .from('daily_routines')
            .select('*')
            .eq('id', routineId)
            .single();
        
        if (error) throw error;
        
        // 모달 생성
        const modal = document.createElement('div');
        modal.id = 'routineDetailModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 32px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="margin: 0; font-size: 1.5rem; color: #1e293b;">📅 ${formatDateKR(routine.routine_date)} 데일리 루틴</h3>
                    <button onclick="closeRoutineDetailModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">✕</button>
                </div>
                
                ${renderRoutineDetailContent(routine)}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeRoutineDetailModal();
            }
        });
        
    } catch (error) {
        console.error('루틴 상세 로드 실패:', error);
        alert('루틴 상세 정보를 불러오지 못했습니다.');
    }
}

/**
 * 루틴 상세 내용 렌더링
 * @param {Object} routine - 루틴 객체
 * @returns {string} HTML 문자열
 */
function renderRoutineDetailContent(routine) {
    const sleepInfo = calculateSleepHours(routine.sleep_time, routine.wake_time);
    
    return `
        <div class="routine-detail-section">
            <h4>📏 신체 측정</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">키:</span>
                    <span class="detail-value">${routine.height ? routine.height.toFixed(1) + ' cm' : '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">몸무게:</span>
                    <span class="detail-value">${routine.weight ? routine.weight.toFixed(1) + ' kg' : '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">예측키(기본):</span>
                    <span class="detail-value">${routine.predicted_height_basic ? routine.predicted_height_basic.toFixed(1) + ' cm' : '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">뼈나이:</span>
                    <span class="detail-value">${routine.bone_age ? routine.bone_age + ' 세' : '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">예측키(뼈나이):</span>
                    <span class="detail-value">${routine.predicted_height_bone_age ? routine.predicted_height_bone_age.toFixed(1) + ' cm' : '-'}</span>
                </div>
            </div>
        </div>
        
        <div class="routine-detail-section">
            <h4>😴 수면</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">취침 시간:</span>
                    <span class="detail-value">${routine.sleep_time || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">기상 시간:</span>
                    <span class="detail-value">${routine.wake_time || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">수면 시간:</span>
                    <span class="detail-value">${sleepInfo}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">수면 질:</span>
                    <span class="detail-value">${routine.sleep_quality || '-'}</span>
                </div>
            </div>
        </div>
        
        <div class="routine-detail-section">
            <h4>💧 수분 섭취</h4>
            <p>${routine.water_amount ? routine.water_amount + ' ml' : '기록 없음'}</p>
        </div>
        
        <div class="routine-detail-section">
            <h4>🍽️ 식사</h4>
            ${routine.meals && routine.meals.length > 0 ? `
                <div class="meal-list">
                    ${routine.meals.map(meal => `
                        <div class="meal-item">
                            <div><strong>${meal.type}</strong> ${meal.time ? `(${meal.time})` : ''}</div>
                            ${meal.description ? `<div style="color: #64748b; font-size: 0.9rem;">${meal.description}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: #9ca3af;">기록 없음</p>'}
        </div>
        
        <div class="routine-detail-section">
            <h4>🏃 운동</h4>
            ${routine.exercises && routine.exercises.length > 0 ? `
                <div class="exercise-list">
                    ${routine.exercises.map(exercise => `
                        <div class="exercise-item">
                            <span class="routine-badge yes">${exercise.type || exercise}</span>
                            ${exercise.duration ? `<span style="color: #64748b; font-size: 0.9rem;">${exercise.duration}분</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: #9ca3af;">기록 없음</p>'}
        </div>
        
        <div class="routine-detail-section">
            <h4>💊 영양제</h4>
            ${routine.supplements && routine.supplements.length > 0 ? `
                <div class="supplement-list">
                    ${routine.supplements.map(supp => `
                        <span class="routine-badge yes">${supp.name || supp}</span>
                    `).join('')}
                </div>
            ` : '<p style="color: #9ca3af;">기록 없음</p>'}
        </div>
        
        <div class="routine-detail-section">
            <h4>💉 성장 주사</h4>
            <p>${routine.growth_injection ? '✅ 투여됨' : '미투여'}</p>
            ${routine.injection_time ? `<p style="color: #64748b; font-size: 0.9rem;">투여 시간: ${routine.injection_time}</p>` : ''}
        </div>
        
        <div class="routine-detail-section">
            <h4>😊 기분</h4>
            <p>${routine.mood || '기록 없음'}</p>
        </div>
        
        ${routine.notes ? `
            <div class="routine-detail-section">
                <h4>📝 메모</h4>
                <p>${routine.notes}</p>
            </div>
        ` : ''}
        
        <style>
            .routine-detail-section {
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid #f1f5f9;
            }
            
            .routine-detail-section:last-child {
                border-bottom: none;
            }
            
            .routine-detail-section h4 {
                margin: 0 0 12px 0;
                font-size: 1.1rem;
                color: #334155;
            }
            
            .detail-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 12px;
            }
            
            .detail-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 12px;
                background: #f8fafc;
                border-radius: 6px;
            }
            
            .detail-label {
                font-weight: 500;
                color: #64748b;
            }
            
            .detail-value {
                font-weight: 600;
                color: #1e293b;
            }
            
            .meal-list, .exercise-list, .supplement-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .meal-item {
                padding: 10px;
                background: #f8fafc;
                border-radius: 6px;
            }
            
            .exercise-item {
                display: flex;
                align-items: center;
                gap: 8px;
            }
        </style>
    `;
}

/**
 * 루틴 상세 모달 닫기
 */
function closeRoutineDetailModal() {
    const modal = document.getElementById('routineDetailModal');
    if (modal) {
        modal.remove();
    }
}

console.log('✅ 관리자 데일리 루틴 스크립트 로드 완료');
