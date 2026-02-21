// ================================================
// 데일리 루틴 달력 관리 (관리자용)
// ================================================

/**
 * 특정 아이의 데일리 루틴 달력 표시
 * @param {string} childId - 아이 ID
 */
async function loadDailyRoutinesCalendar(childId) {
    console.log(`📅 [관리자] 데일리 루틴 달력 로드 시작: ${childId}`);
    
    const container = document.getElementById(`dailyRoutines_${childId}`);
    if (!container) {
        console.error('데일리 루틴 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    container.innerHTML = '<div class="loading" style="padding: 20px; text-align: center;">⏳ 데이터를 불러오는 중...</div>';
    
    try {
        // 현재 달의 첫날과 마지막날 계산
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        
        // Supabase에서 현재 달의 데일리 루틴 가져오기
        const { data: routines, error } = await supabase
            .from('daily_routines')
            .select('*')
            .eq('child_id', childId)
            .gte('routine_date', firstDay.toISOString().split('T')[0])
            .lte('routine_date', lastDay.toISOString().split('T')[0])
            .order('routine_date', { ascending: true });
        
        if (error) throw error;
        
        console.log(`✅ [관리자] ${routines.length}개 데일리 루틴 로드 완료`);
        
        // 달력 렌더링
        renderCalendar(container, childId, currentYear, currentMonth, routines);
        
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
 * 달력 렌더링
 * @param {HTMLElement} container - 렌더링할 컨테이너
 * @param {string} childId - 아이 ID
 * @param {number} year - 연도
 * @param {number} month - 월 (0-11)
 * @param {Array} routines - 데일리 루틴 배열
 */
function renderCalendar(container, childId, year, month, routines) {
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    // 루틴 데이터를 날짜별로 맵핑
    const routineMap = {};
    routines.forEach(routine => {
        const date = new Date(routine.routine_date).getDate();
        routineMap[date] = routine;
    });
    
    // 달력 HTML 생성
    let calendarHTML = `
        <div class="admin-calendar-wrapper">
            <!-- 달력 헤더 -->
            <div class="admin-calendar-header">
                <button class="calendar-nav-btn" onclick="changeMonth('${childId}', ${year}, ${month - 1})">
                    ◀ 이전
                </button>
                <h3 class="calendar-title">${year}년 ${monthNames[month]}</h3>
                <button class="calendar-nav-btn" onclick="changeMonth('${childId}', ${year}, ${month + 1})">
                    다음 ▶
                </button>
            </div>
            
            <!-- 범례 -->
            <div class="calendar-legend">
                <div class="legend-item">
                    <span class="legend-dot" style="background: #3b82f6;">●</span>
                    <span>식단</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot" style="background: #10b981;">●</span>
                    <span>영양제</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot" style="background: #8b5cf6;">●</span>
                    <span>수면</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot" style="background: #f59e0b;">●</span>
                    <span>운동</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot" style="background: #ef4444;">●</span>
                    <span>성장주사</span>
                </div>
            </div>
            
            <!-- 달력 그리드 -->
            <div class="admin-calendar-grid">
                <!-- 요일 헤더 -->
                <div class="calendar-day-header">일</div>
                <div class="calendar-day-header">월</div>
                <div class="calendar-day-header">화</div>
                <div class="calendar-day-header">수</div>
                <div class="calendar-day-header">목</div>
                <div class="calendar-day-header">금</div>
                <div class="calendar-day-header">토</div>
                
                <!-- 빈 칸 (이전 달) -->
                ${Array(startDayOfWeek).fill(0).map(() => '<div class="calendar-day empty"></div>').join('')}
                
                <!-- 날짜 칸 -->
                ${Array(daysInMonth).fill(0).map((_, i) => {
                    const day = i + 1;
                    const routine = routineMap[day];
                    const today = new Date();
                    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                    
                    return renderCalendarDay(day, routine, isToday);
                }).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = calendarHTML;
}

/**
 * 달력 날짜 칸 렌더링
 * @param {number} day - 날짜
 * @param {Object} routine - 루틴 데이터 (없을 수 있음)
 * @param {boolean} isToday - 오늘 여부
 * @returns {string} HTML
 */
function renderCalendarDay(day, routine, isToday) {
    if (!routine) {
        return `
            <div class="calendar-day ${isToday ? 'today' : ''}">
                <div class="day-number">${day}</div>
                <div class="day-content empty-day">
                    <div style="color: #cbd5e0; font-size: 0.75rem;">기록 없음</div>
                </div>
            </div>
        `;
    }
    
    // 카테고리별 데이터 추출
    const categories = [];
    
    // 1. 식단 (meals)
    if (routine.meals && Array.isArray(routine.meals) && routine.meals.length > 0) {
        categories.push({
            icon: '🍽️',
            label: `식사 ${routine.meals.length}끼`,
            color: '#3b82f6'
        });
    }
    
    // 2. 영양제 (supplements)
    if (routine.supplements && Array.isArray(routine.supplements) && routine.supplements.length > 0) {
        categories.push({
            icon: '💊',
            label: `영양제 ${routine.supplements.length}개`,
            color: '#10b981'
        });
    }
    
    // 3. 수면 (sleep)
    if (routine.sleep_time && routine.wake_time) {
        categories.push({
            icon: '😴',
            label: `수면`,
            color: '#8b5cf6'
        });
    }
    
    // 4. 운동 (exercises)
    if (routine.exercises && Array.isArray(routine.exercises) && routine.exercises.length > 0) {
        categories.push({
            icon: '🏃',
            label: `운동 ${routine.exercises.length}개`,
            color: '#f59e0b'
        });
    }
    
    // 5. 성장주사
    if (routine.growth_injection === true) {
        categories.push({
            icon: '💉',
            label: '주사',
            color: '#ef4444'
        });
    }
    
    return `
        <div class="calendar-day ${isToday ? 'today' : ''} has-data" onclick="showRoutineDetailModal('${routine.id}')">
            <div class="day-number">${day}</div>
            <div class="day-content">
                ${categories.map(cat => `
                    <div class="category-badge" style="background: ${cat.color}15; border-left: 3px solid ${cat.color};">
                        <span class="category-icon">${cat.icon}</span>
                        <span class="category-label">${cat.label}</span>
                    </div>
                `).join('')}
                
                ${routine.height ? `<div class="day-stats">📏 ${routine.height} cm</div>` : ''}
                ${routine.weight ? `<div class="day-stats">⚖️ ${routine.weight} kg</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * 달 변경
 * @param {string} childId - 아이 ID
 * @param {number} year - 연도
 * @param {number} month - 월 (0-11)
 */
async function changeMonth(childId, year, month) {
    // 월 범위 조정
    if (month < 0) {
        year--;
        month = 11;
    } else if (month > 11) {
        year++;
        month = 0;
    }
    
    const container = document.getElementById(`dailyRoutines_${childId}`);
    container.innerHTML = '<div class="loading" style="padding: 20px; text-align: center;">⏳ 데이터를 불러오는 중...</div>';
    
    try {
        // 선택한 달의 첫날과 마지막날 계산
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Supabase에서 해당 월의 데일리 루틴 가져오기
        const { data: routines, error } = await supabase
            .from('daily_routines')
            .select('*')
            .eq('child_id', childId)
            .gte('routine_date', firstDay.toISOString().split('T')[0])
            .lte('routine_date', lastDay.toISOString().split('T')[0])
            .order('routine_date', { ascending: true });
        
        if (error) throw error;
        
        // 달력 렌더링
        renderCalendar(container, childId, year, month, routines);
        
    } catch (error) {
        console.error('데일리 루틴 로드 실패:', error);
        container.innerHTML = `
            <div class="error-state-small">
                <p style="color: #e53e3e; font-size: 0.9rem;">❌ 데일리 루틴을 불러오는데 실패했습니다</p>
            </div>
        `;
    }
}

/**
 * 루틴 상세 정보 모달 표시
 * @param {string} routineId - 루틴 ID
 */
async function showRoutineDetailModal(routineId) {
    console.log('루틴 상세 보기:', routineId);
    
    try {
        // Supabase에서 루틴 데이터 가져오기
        const { data: routine, error } = await supabase
            .from('daily_routines')
            .select('*')
            .eq('id', routineId)
            .single();
        
        if (error) throw error;
        
        // 모달 HTML 생성
        const modalHTML = `
            <div class="modal-overlay" id="routineDetailModal" onclick="closeRoutineDetailModal(event)">
                <div class="modal-content routine-detail-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2>📅 데일리 루틴 상세</h2>
                        <button class="modal-close" onclick="closeRoutineDetailModal()">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <!-- 날짜 -->
                        <div class="detail-section">
                            <h3>📆 날짜</h3>
                            <p class="detail-value">${routine.routine_date}</p>
                        </div>
                        
                        <!-- 신체 측정 -->
                        ${routine.height || routine.weight ? `
                        <div class="detail-section">
                            <h3>📏 신체 측정</h3>
                            <div class="detail-grid">
                                ${routine.height ? `<div class="detail-item"><span class="detail-label">키:</span> <span class="detail-value">${routine.height} cm</span></div>` : ''}
                                ${routine.weight ? `<div class="detail-item"><span class="detail-label">몸무게:</span> <span class="detail-value">${routine.weight} kg</span></div>` : ''}
                                ${routine.predicted_height_basic ? `<div class="detail-item"><span class="detail-label">예측키:</span> <span class="detail-value">${routine.predicted_height_basic} cm</span></div>` : ''}
                                ${routine.bone_age ? `<div class="detail-item"><span class="detail-label">뼈나이:</span> <span class="detail-value">${routine.bone_age}세</span></div>` : ''}
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- 수면 -->
                        ${routine.sleep_time || routine.wake_time ? `
                        <div class="detail-section">
                            <h3>😴 수면</h3>
                            <div class="detail-grid">
                                ${routine.sleep_time ? `<div class="detail-item"><span class="detail-label">취침:</span> <span class="detail-value">${routine.sleep_time}</span></div>` : ''}
                                ${routine.wake_time ? `<div class="detail-item"><span class="detail-label">기상:</span> <span class="detail-value">${routine.wake_time}</span></div>` : ''}
                                ${routine.sleep_quality ? `<div class="detail-item"><span class="detail-label">수면 품질:</span> <span class="detail-value">${getSleepQualityText(routine.sleep_quality)}</span></div>` : ''}
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- 수분 섭취 -->
                        ${routine.water_amount ? `
                        <div class="detail-section">
                            <h3>💧 수분 섭취</h3>
                            <p class="detail-value">${routine.water_amount} ml</p>
                        </div>
                        ` : ''}
                        
                        <!-- 식사 -->
                        ${routine.meals && routine.meals.length > 0 ? `
                        <div class="detail-section">
                            <h3>🍽️ 식사 (${routine.meals.length}끼)</h3>
                            <div class="meals-list">
                                ${routine.meals.map(meal => `
                                    <div class="meal-item">
                                        <div class="meal-time">${meal.time || ''} - ${meal.type || '식사'}</div>
                                        ${meal.menu ? `<div class="meal-menu">${meal.menu}</div>` : ''}
                                        ${meal.quality ? `<div class="meal-quality">품질: ${meal.quality}</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- 운동 -->
                        ${routine.exercises && routine.exercises.length > 0 ? `
                        <div class="detail-section">
                            <h3>🏃 운동 (${routine.exercises.length}개)</h3>
                            <div class="exercises-list">
                                ${routine.exercises.map(exercise => `
                                    <div class="exercise-item">
                                        <div class="exercise-name">${exercise.name || ''}</div>
                                        ${exercise.duration ? `<div class="exercise-duration">${exercise.duration}분</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- 영양제 -->
                        ${routine.supplements && routine.supplements.length > 0 ? `
                        <div class="detail-section">
                            <h3>💊 영양제 (${routine.supplements.length}개)</h3>
                            <div class="supplements-list">
                                ${routine.supplements.map(supplement => `
                                    <div class="supplement-item">${supplement}</div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                        
                        <!-- 성장 주사 -->
                        ${routine.growth_injection !== null ? `
                        <div class="detail-section">
                            <h3>💉 성장 주사</h3>
                            <p class="detail-value">
                                ${routine.growth_injection ? `✅ 투여됨 ${routine.injection_time ? `(${routine.injection_time})` : ''}` : '❌ 투여 안 함'}
                            </p>
                        </div>
                        ` : ''}
                        
                        <!-- 기분 -->
                        ${routine.mood ? `
                        <div class="detail-section">
                            <h3>😊 기분</h3>
                            <p class="detail-value">${getMoodEmoji(routine.mood)} ${routine.mood}</p>
                        </div>
                        ` : ''}
                        
                        <!-- 메모 -->
                        ${routine.notes ? `
                        <div class="detail-section">
                            <h3>📝 메모</h3>
                            <p class="detail-value">${routine.notes}</p>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="closeRoutineDetailModal()">닫기</button>
                    </div>
                </div>
            </div>
        `;
        
        // 모달 추가
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (error) {
        console.error('루틴 상세 로드 실패:', error);
        alert('루틴 정보를 불러오는데 실패했습니다.');
    }
}

/**
 * 루틴 상세 모달 닫기
 */
function closeRoutineDetailModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.getElementById('routineDetailModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * 수면 품질 텍스트 변환
 */
function getSleepQualityText(quality) {
    const qualityMap = {
        'Excellent': '😊 매우 좋음',
        'Good': '😀 좋음',
        'Fair': '😐 보통',
        'Poor': '😞 나쁨'
    };
    return qualityMap[quality] || quality;
}

/**
 * 기분 이모지 반환
 */
function getMoodEmoji(mood) {
    const moodMap = {
        'excellent': '😄',
        'good': '😊',
        'normal': '😐',
        'bad': '😞',
        'terrible': '😢'
    };
    return moodMap[mood] || '😊';
}

// 전역 함수로 노출
window.loadDailyRoutinesCalendar = loadDailyRoutinesCalendar;
window.changeMonth = changeMonth;
window.showRoutineDetailModal = showRoutineDetailModal;
window.closeRoutineDetailModal = closeRoutineDetailModal;

console.log('✅ 관리자 데일리 루틴 달력 스크립트 로드 완료');
