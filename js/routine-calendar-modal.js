// ===== 루틴 달력 모달 JavaScript =====

let calendarCurrentDate = new Date();
let calendarSelectedDate = null;
let calendarRoutineData = {};

/**
 * 루틴 달력 모달 열기
 */
async function openRoutineCalendar() {
    console.log('📅 루틴 달력 모달 열기');
    
    // 현재 날짜로 초기화
    calendarCurrentDate = new Date(currentDate);
    calendarSelectedDate = new Date(currentDate);
    
    // 모달 표시
    const modal = document.getElementById('routineCalendarModal');
    modal.style.display = 'flex';
    
    // 데이터 로드 및 달력 렌더링
    await loadCalendarRoutineData();
    renderRoutineCalendar();
}

/**
 * 루틴 달력 모달 닫기
 */
function closeRoutineCalendar() {
    const modal = document.getElementById('routineCalendarModal');
    modal.style.display = 'none';
}

/**
 * 달력 월 변경
 */
async function changeCalendarMonth(delta) {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + delta);
    await loadCalendarRoutineData();
    renderRoutineCalendar();
}

/**
 * 달력 루틴 데이터 로드
 */
async function loadCalendarRoutineData() {
    if (!selectedChildId) {
        console.warn('⚠️ 선택된 아이가 없습니다');
        return;
    }
    
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    // 해당 월의 첫날과 마지막날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    console.log(`📊 루틴 데이터 로드: ${year}-${month + 1}`);
    
    try {
        // Supabase에서 해당 월의 루틴 데이터 가져오기
        const { data, error } = await supabase
            .from('daily_routines')
            .select('*')
            .eq('child_id', selectedChildId)
            .gte('routine_date', firstDay.toISOString().split('T')[0])
            .lte('routine_date', lastDay.toISOString().split('T')[0]);
        
        if (error) throw error;
        
        // 날짜별로 맵핑
        calendarRoutineData = {};
        if (data && data.length > 0) {
            data.forEach(routine => {
                const date = new Date(routine.routine_date);
                const day = date.getDate();
                calendarRoutineData[day] = routine;
            });
        }
        
        console.log(`✅ 루틴 데이터 ${data ? data.length : 0}개 로드 완료`);
        
    } catch (error) {
        console.error('❌ 루틴 데이터 로드 실패:', error);
        calendarRoutineData = {};
    }
}

/**
 * 루틴 달력 렌더링
 */
function renderRoutineCalendar() {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    // 월/년도 표시
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    document.getElementById('calendarMonthYear').textContent = `${year}년 ${monthNames[month]}`;
    
    // 달력 그리드
    const grid = document.getElementById('routineCalendarGrid');
    grid.innerHTML = '';
    
    // 요일 헤더
    const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });
    
    // 첫날의 요일
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    // 마지막 날짜
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // 빈 칸 추가
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day-cell empty';
        grid.appendChild(emptyCell);
    }
    
    // 오늘 날짜
    const today = new Date();
    
    // 날짜 칸 추가
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        
        const cellDate = new Date(year, month, day);
        
        // 오늘 표시
        if (cellDate.toDateString() === today.toDateString()) {
            cell.classList.add('today');
        }
        
        // 선택된 날짜 표시
        if (calendarSelectedDate && cellDate.toDateString() === calendarSelectedDate.toDateString()) {
            cell.classList.add('selected');
        }
        
        // 날짜 번호
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        cell.appendChild(dayNumber);
        
        // 루틴 데이터가 있으면 인디케이터 표시
        const routine = calendarRoutineData[day];
        if (routine) {
            const indicators = document.createElement('div');
            indicators.className = 'calendar-day-indicators';
            
            // 수면
            if (routine.sleep_time && routine.wake_time) {
                const indicator = document.createElement('div');
                indicator.className = 'data-indicator indicator-sleep';
                indicator.title = '수면';
                indicators.appendChild(indicator);
            }
            
            // 수분
            if (routine.water_amount && routine.water_amount > 0) {
                const indicator = document.createElement('div');
                indicator.className = 'data-indicator indicator-water';
                indicator.title = '수분';
                indicators.appendChild(indicator);
            }
            
            // 식사
            if (routine.meals && Array.isArray(routine.meals) && routine.meals.length > 0) {
                const indicator = document.createElement('div');
                indicator.className = 'data-indicator indicator-meals';
                indicator.title = '식사';
                indicators.appendChild(indicator);
            }
            
            // 운동
            if (routine.exercises && Array.isArray(routine.exercises) && routine.exercises.length > 0) {
                const indicator = document.createElement('div');
                indicator.className = 'data-indicator indicator-exercise';
                indicator.title = '운동';
                indicators.appendChild(indicator);
            }
            
            // 영양제
            if (routine.supplements && Array.isArray(routine.supplements) && routine.supplements.length > 0) {
                const indicator = document.createElement('div');
                indicator.className = 'data-indicator indicator-supplements';
                indicator.title = '영양제';
                indicators.appendChild(indicator);
            }
            
            cell.appendChild(indicators);
        }
        
        // 클릭 이벤트
        cell.onclick = () => selectCalendarDate(year, month, day);
        
        grid.appendChild(cell);
    }
}

/**
 * 달력에서 날짜 선택
 */
function selectCalendarDate(year, month, day) {
    // 날짜 설정
    const selectedDate = new Date(year, month, day);
    currentDate = selectedDate;
    calendarSelectedDate = selectedDate;
    
    // 날짜 표시 업데이트
    updateDateDisplay();
    
    // 해당 날짜 데이터 로드
    loadRoutineData();
    
    // 모달 닫기
    closeRoutineCalendar();
    
    console.log(`📅 날짜 선택: ${year}-${month + 1}-${day}`);
}

// 전역 함수로 노출
window.openRoutineCalendar = openRoutineCalendar;
window.closeRoutineCalendar = closeRoutineCalendar;
window.changeCalendarMonth = changeCalendarMonth;
window.selectCalendarDate = selectCalendarDate;

console.log('✅ 루틴 달력 모달 스크립트 로드 완료');
