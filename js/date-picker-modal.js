// ===== 날짜 선택 모달 =====

// 전역 변수
let pickerDate = new Date(); // 선택된 날짜
let pickerTempDate = new Date(); // 임시 선택 날짜 (확인 전)

// 모달 열기
function openDatePickerModal() {
    console.log('📅 [날짜 모달] 열기 시작');
    const modal = document.getElementById('datePickerModal');
    
    if (!modal) {
        console.error('❌ [날짜 모달] datePickerModal 요소를 찾을 수 없습니다!');
        return;
    }
    
    // currentDate가 정의되어 있는지 확인
    if (typeof currentDate === 'undefined') {
        console.warn('⚠️ [날짜 모달] currentDate 없음, 오늘 날짜 사용');
        pickerTempDate = new Date();
    } else {
        pickerTempDate = new Date(currentDate); // 현재 날짜로 초기화
    }
    
    console.log('📅 [날짜 모달] 선택된 날짜:', pickerTempDate);
    
    // 연도/월 업데이트
    updatePickerDisplay();
    
    // 달력 렌더링
    renderPickerCalendar();
    
    // 모달 표시
    modal.classList.add('active');
    console.log('📅 [날짜 모달] 모달 표시 완료');
    
    // 스크롤 잠금
    document.body.style.overflow = 'hidden';
}

// 전역으로 노출
window.openDatePickerModal = openDatePickerModal;

// 모달 닫기
function closeDatePickerModal() {
    console.log('📅 [날짜 모달] 닫기');
    const modal = document.getElementById('datePickerModal');
    modal.classList.remove('active');
    
    // 스크롤 해제
    document.body.style.overflow = '';
}

// 연도/월 표시 업데이트
function updatePickerDisplay() {
    const yearEl = document.getElementById('pickerYear');
    const monthEl = document.getElementById('pickerMonth');
    
    if (yearEl) yearEl.textContent = pickerTempDate.getFullYear();
    if (monthEl) monthEl.textContent = `${pickerTempDate.getMonth() + 1}월`;
}

// 연도 변경
function changePickerYear(delta) {
    pickerTempDate.setFullYear(pickerTempDate.getFullYear() + delta);
    updatePickerDisplay();
    renderPickerCalendar();
}

// 월 변경
function changePickerMonth(delta) {
    pickerTempDate.setMonth(pickerTempDate.getMonth() + delta);
    updatePickerDisplay();
    renderPickerCalendar();
}

// 달력 렌더링
function renderPickerCalendar() {
    console.log('📅 [날짜 모달] 달력 렌더링:', pickerTempDate);
    
    const container = document.getElementById('pickerDaysContainer');
    if (!container) {
        console.error('[날짜 모달] pickerDaysContainer 없음');
        return;
    }
    
    const year = pickerTempDate.getFullYear();
    const month = pickerTempDate.getMonth();
    
    // 이번 달 첫날/마지막날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 이전 달 마지막날
    const prevLastDay = new Date(year, month, 0);
    
    // 시작 요일 (0 = 일요일)
    const firstDayOfWeek = firstDay.getDay();
    
    // 날짜 배열 생성
    const days = [];
    
    // 이전 달 날짜 채우기
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        days.push({
            date: new Date(year, month - 1, prevLastDay.getDate() - i),
            isCurrentMonth: false
        });
    }
    
    // 이번 달 날짜 채우기
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({
            date: new Date(year, month, i),
            isCurrentMonth: true
        });
    }
    
    // 다음 달 날짜 채우기 (42칸 = 6주)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
        days.push({
            date: new Date(year, month + 1, i),
            isCurrentMonth: false
        });
    }
    
    // HTML 생성
    let html = '';
    const today = new Date();
    
    days.forEach(day => {
        const classes = ['picker-calendar-day'];
        
        if (!day.isCurrentMonth) {
            classes.push('other-month');
        }
        
        // 오늘 날짜 체크
        if (isSameDay(day.date, today)) {
            classes.push('today');
        }
        
        // 선택된 날짜 체크
        if (isSameDay(day.date, pickerTempDate)) {
            classes.push('selected');
        }
        
        const dateStr = formatDate(day.date);
        
        // 측정 데이터가 있는지 체크
        const hasData = checkRoutineData(dateStr);
        if (hasData) {
            classes.push('has-data');
        }
        
        html += `
            <div class="${classes.join(' ')}" onclick="selectPickerDay('${dateStr}')">
                ${day.date.getDate()}
                ${hasData ? '<span class="data-indicator"></span>' : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 루틴 데이터 존재 여부 체크
function checkRoutineData(dateStr) {
    // selectedChildId 확인
    const selectedChildId = localStorage.getItem('selectedChildId');
    if (!selectedChildId) return false;
    
    // routine 데이터 확인
    const key = `routine_${selectedChildId}_${dateStr}`;
    return localStorage.getItem(key) !== null;
}

// 날짜 선택
function selectPickerDay(dateStr) {
    console.log('📅 [날짜 모달] 날짜 선택:', dateStr);
    const [year, month, day] = dateStr.split('-').map(Number);
    pickerTempDate = new Date(year, month - 1, day);
    renderPickerCalendar();
}

// 오늘 선택
function selectPickerToday() {
    console.log('📅 [날짜 모달] 오늘 선택');
    pickerTempDate = new Date();
    updatePickerDisplay();
    renderPickerCalendar();
}

// 날짜 확인
function confirmPickerDate() {
    console.log('📅 [날짜 모달] 날짜 확인:', pickerTempDate);
    
    // 현재 날짜 업데이트
    currentDate = new Date(pickerTempDate);
    
    // UI 업데이트
    updateDateDisplay();
    
    // 루틴 데이터 로드
    loadRoutineData();
    
    // 모달 닫기
    closeDatePickerModal();
}

// ESC 키로 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('datePickerModal');
        if (modal && modal.classList.contains('active')) {
            closeDatePickerModal();
        }
    }
});

// 모달 배경 클릭 시 닫기
document.addEventListener('click', function(e) {
    const modal = document.getElementById('datePickerModal');
    if (e.target === modal) {
        closeDatePickerModal();
    }
});

console.log('✅ [날짜 모달] 스크립트 로드 완료');
