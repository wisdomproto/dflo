// 챌린지 모바일 스크립트
let currentTab = 'exercise';
let selectedDate = getTodayDate();

document.addEventListener('DOMContentLoaded', function() {
    updateSelectedChildName();
    initializeChallenges();
    updateStreakDisplay();
    updateDateDisplay();
});

// 아이 변경 이벤트 리스너
window.addEventListener('childChanged', function() {
    updateSelectedChildName();
    initializeChallenges();
    updateStreakDisplay();
    
    // 달력이 열려있으면 다시 렌더링
    const calendarModal = document.getElementById('calendarModal');
    if (calendarModal && calendarModal.style.display === 'flex') {
        renderCalendar();
    }
});

// 선택된 아이 이름 표시
function updateSelectedChildName() {
    const selectedChild = StorageManager.getSelectedChild();
    const nameElement = document.getElementById('selectedChildName');
    
    if (selectedChild && nameElement) {
        const genderIcon = selectedChild.gender === 'male' ? '👦' : '👧';
        nameElement.textContent = `${genderIcon} ${selectedChild.name}의 챌린지`;
    } else if (nameElement) {
        nameElement.textContent = '꾸준한 실천으로 건강하게 성장해요';
    }
}

// 날짜 변경
function changeDate(days) {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    selectedDate = formatDate(current);
    updateDateDisplay();
    initializeChallenges();
}

// 날짜 선택기 열기
function openDatePicker() {
    document.getElementById('hiddenDatePicker').value = selectedDate;
    document.getElementById('hiddenDatePicker').click();
}

// 날짜 선택
function selectDate(date) {
    selectedDate = date;
    updateDateDisplay();
    initializeChallenges();
}

// 날짜 표시 업데이트
function updateDateDisplay() {
    const dateElement = document.getElementById('currentDate');
    const today = getTodayDate();
    
    if (selectedDate === today) {
        dateElement.textContent = '오늘';
    } else {
        const selected = new Date(selectedDate);
        const month = selected.getMonth() + 1;
        const day = selected.getDate();
        dateElement.textContent = `${month}월 ${day}일`;
    }
}

function initializeChallenges() {
    renderPostureExercises();
    renderGrowthExercises();
    renderDietChallenges();
    renderSleepChallenges();
    renderCustomChallenges();
}

function renderPostureExercises() {
    const container = document.getElementById('postureExercises');
    container.innerHTML = challengeData.exercise.posture.map(exercise => 
        createChallengeCard('exercise', exercise)
    ).join('');
}

function renderGrowthExercises() {
    const container = document.getElementById('growthExercises');
    container.innerHTML = challengeData.exercise.growth.map(exercise => 
        createChallengeCard('exercise', exercise)
    ).join('');
}

function renderDietChallenges() {
    const container = document.getElementById('dietChallenges');
    container.innerHTML = challengeData.diet.map(challenge => 
        createChallengeCard('diet', challenge)
    ).join('');
}

function renderSleepChallenges() {
    const container = document.getElementById('sleepChallenges');
    container.innerHTML = challengeData.sleep.map(challenge => 
        createChallengeCard('sleep', challenge)
    ).join('');
}

function renderCustomChallenges() {
    const customChallenges = getCustomChallenges();
    const container = document.getElementById('customChallenges');
    
    if (customChallenges.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✨</div><div>나만의 챌린지를 추가해보세요</div></div>';
        return;
    }
    
    container.innerHTML = customChallenges.map(challenge => {
        const isCompleted = isChallengeCompleted('custom', challenge.id);
        const stats = getChallengeStats('custom', challenge.id);
        
        return `
            <div class="challenge-card ${isCompleted ? 'completed' : ''}">
                <div class="challenge-header">
                    <div class="challenge-icon">✨</div>
                    <div class="challenge-check" onclick="toggleChallenge('custom', '${challenge.id}')">
                        ${isCompleted ? '✓' : ''}
                    </div>
                </div>
                <h3 class="challenge-title">${challenge.title}</h3>
                <div class="challenge-stats">
                    <span>완료: <strong>${stats.completed}회</strong></span>
                </div>
                <button class="btn-delete-challenge" onclick="deleteCustomChallenge('${challenge.id}')">🗑️ 삭제</button>
            </div>
        `;
    }).join('');
}

function createChallengeCard(category, challenge) {
    const isCompleted = isChallengeCompleted(category, challenge.id);
    const stats = getChallengeStats(category, challenge.id);
    
    return `
        <div class="challenge-card ${isCompleted ? 'completed' : ''}">
            <div class="challenge-header">
                <div class="challenge-icon">${challenge.icon}</div>
                <div class="challenge-check" onclick="toggleChallenge('${category}', '${challenge.id}')">
                    ${isCompleted ? '✓' : ''}
                </div>
            </div>
            <h3 class="challenge-title">${challenge.title}</h3>
            <p class="challenge-description">${challenge.description}</p>
            ${challenge.videoUrl ? `
                <a href="${challenge.videoUrl}" target="_blank" class="btn-video">
                    ▶️ 동영상 보기
                </a>
            ` : ''}
            <div class="challenge-stats">
                <span>완료: <strong>${stats.completed}회</strong></span>
            </div>
        </div>
    `;
}

function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');
}

function toggleChallenge(category, id) {
    const childId = StorageManager.getSelectedChildId();
    if (!childId) {
        alert('아이를 선택해주세요');
        return;
    }
    
    // 전체 챌린지 데이터 가져오기
    const allChallenges = JSON.parse(localStorage.getItem('challenges') || '{}');
    
    // 현재 아이의 챌린지 데이터 초기화
    if (!allChallenges[childId]) {
        allChallenges[childId] = {};
    }
    if (!allChallenges[childId][category]) {
        allChallenges[childId][category] = {};
    }
    if (!allChallenges[childId][category][id]) {
        allChallenges[childId][category][id] = [];
    }
    
    // 날짜 토글
    const dateArray = allChallenges[childId][category][id];
    const index = dateArray.indexOf(selectedDate);
    
    if (index > -1) {
        dateArray.splice(index, 1);
    } else {
        dateArray.push(selectedDate);
    }
    
    // 전체 구조 저장
    localStorage.setItem('challenges', JSON.stringify(allChallenges));
    
    initializeChallenges();
    updateStreakDisplay();
    
    // 달력이 열려있으면 다시 렌더링
    const calendarModal = document.getElementById('calendarModal');
    if (calendarModal && calendarModal.style.display === 'flex') {
        renderCalendar();
    }
}

function isChallengeCompleted(category, id) {
    const challenges = StorageManager.getChallenges();
    return challenges[category]?.[id]?.includes(selectedDate) || false;
}

function getChallengeStats(category, id) {
    const challenges = StorageManager.getChallenges();
    const completions = challenges[category]?.[id] || [];
    
    return {
        completed: completions.length,
        lastCompleted: completions.length > 0 ? completions[completions.length - 1] : null
    };
}

function updateStreakDisplay() {
    const stats = StorageManager.getStats();
    const streakElement = document.getElementById('streakDays');
    if (streakElement) {
        animateNumber(streakElement, 0, stats.challengeStreak, 1000);
    }
}

function addCustomChallenge(event) {
    event.preventDefault();
    
    const title = document.getElementById('customTitle').value.trim();
    if (!title) return;
    
    const customChallenges = getCustomChallenges();
    const newChallenge = {
        id: 'custom-' + Date.now(),
        title: title
    };
    
    customChallenges.push(newChallenge);
    localStorage.setItem('customChallenges', JSON.stringify(customChallenges));
    
    document.getElementById('customChallengeForm').reset();
    renderCustomChallenges();
}

function deleteCustomChallenge(id) {
    if (!confirm('이 챌린지를 삭제하시겠습니까?')) return;
    
    let customChallenges = getCustomChallenges();
    customChallenges = customChallenges.filter(c => c.id !== id);
    localStorage.setItem('customChallenges', JSON.stringify(customChallenges));
    
    const challenges = StorageManager.getChallenges();
    if (challenges.custom && challenges.custom[id]) {
        delete challenges.custom[id];
        localStorage.setItem('challenges', JSON.stringify(challenges));
    }
    
    renderCustomChallenges();
}

function getCustomChallenges() {
    return JSON.parse(localStorage.getItem('customChallenges') || '[]');
}

// ===== 달력 기능 =====

let currentCalendarDate = new Date();

// 달력 토글
function toggleCalendar() {
    const modal = document.getElementById('calendarModal');
    const isVisible = modal.style.display === 'flex';
    
    if (isVisible) {
        modal.style.display = 'none';
        document.getElementById('calendarDetail').style.display = 'none';
    } else {
        modal.style.display = 'flex';
        currentCalendarDate = new Date();
        renderCalendar();
    }
}

// 달력 월 변경
function changeCalendarMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar();
}

// 달력 렌더링
function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // 제목 업데이트
    document.getElementById('calendarTitle').textContent = 
        `${year}년 ${month + 1}월`;
    
    // 해당 월의 첫날과 마지막날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevMonthLastDay = new Date(year, month, 0);
    
    // 시작 요일 (일요일 = 0)
    const startDayOfWeek = firstDay.getDay();
    
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    const today = new Date();
    const todayStr = formatDate(today);
    
    // 이전 달 마지막 주
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay.getDate() - i;
        const date = new Date(year, month - 1, day);
        calendarGrid.appendChild(createCalendarDay(date, true));
    }
    
    // 현재 달
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const isToday = formatDate(date) === todayStr;
        calendarGrid.appendChild(createCalendarDay(date, false, isToday));
    }
    
    // 다음 달 첫 주 (42칸 채우기 - 6주)
    const remainingDays = 42 - calendarGrid.children.length;
    for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month + 1, day);
        calendarGrid.appendChild(createCalendarDay(date, true));
    }
}

// 달력 날짜 셀 생성
function createCalendarDay(date, isOtherMonth, isToday = false) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    
    if (isOtherMonth) {
        dayDiv.classList.add('other-month');
    }
    
    if (isToday) {
        dayDiv.classList.add('today');
    }
    
    // 날짜 숫자
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = date.getDate();
    dayDiv.appendChild(dayNumber);
    
    // 해당 날짜의 챌린지 완료 정보
    const dateStr = formatDate(date);
    const dots = getChallengeDots(dateStr);
    
    if (dots.length > 0) {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'calendar-day-dots';
        
        dots.forEach(category => {
            const dot = document.createElement('div');
            dot.className = `calendar-dot ${category}`;
            dotsContainer.appendChild(dot);
        });
        
        dayDiv.appendChild(dotsContainer);
    }
    
    // 클릭 이벤트
    dayDiv.onclick = () => showDateDetail(dateStr);
    
    return dayDiv;
}

// 해당 날짜에 완료된 챌린지 카테고리 반환
function getChallengeDots(dateStr) {
    const challenges = StorageManager.getChallenges();
    const dots = [];
    
    // 운동 (최소 1개 이상 완료)
    if (challenges.exercise) {
        for (const id in challenges.exercise) {
            if (challenges.exercise[id].includes(dateStr)) {
                dots.push('exercise');
                break;
            }
        }
    }
    
    // 식단 (최소 1개 이상 완료)
    if (challenges.diet) {
        for (const id in challenges.diet) {
            if (challenges.diet[id].includes(dateStr)) {
                dots.push('diet');
                break;
            }
        }
    }
    
    // 수면 (최소 1개 이상 완료)
    if (challenges.sleep) {
        for (const id in challenges.sleep) {
            if (challenges.sleep[id].includes(dateStr)) {
                dots.push('sleep');
                break;
            }
        }
    }
    
    // 자유 (최소 1개 이상 완료)
    if (challenges.custom) {
        for (const id in challenges.custom) {
            if (challenges.custom[id].includes(dateStr)) {
                dots.push('custom');
                break;
            }
        }
    }
    
    return dots;
}

// 날짜 상세 정보 표시
function showDateDetail(dateStr) {
    const detailDiv = document.getElementById('calendarDetail');
    const dateObj = new Date(dateStr);
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    
    document.getElementById('detailDate').textContent = 
        `${month}월 ${day}일 챌린지 현황`;
    
    const challenges = StorageManager.getChallenges();
    
    let content = '';
    
    // 운동 - 바른자세 + 성장판 자극
    const exerciseIds = [...challengeData.exercise.posture, ...challengeData.exercise.growth].map(e => e.id);
    let exerciseCompleted = 0;
    let exerciseTotal = exerciseIds.length;
    
    if (challenges.exercise) {
        exerciseIds.forEach(id => {
            if (challenges.exercise[id] && challenges.exercise[id].includes(dateStr)) {
                exerciseCompleted++;
            }
        });
    }
    
    const exercisePercent = exerciseTotal > 0 ? Math.round((exerciseCompleted / exerciseTotal) * 100) : 0;
    content += createDetailCategory('운동', '#14b8a6', exerciseCompleted, exerciseTotal, exercisePercent);
    
    // 식단
    const dietIds = challengeData.diet.map(d => d.id);
    let dietCompleted = 0;
    let dietTotal = dietIds.length;
    
    if (challenges.diet) {
        dietIds.forEach(id => {
            if (challenges.diet[id] && challenges.diet[id].includes(dateStr)) {
                dietCompleted++;
            }
        });
    }
    
    const dietPercent = dietTotal > 0 ? Math.round((dietCompleted / dietTotal) * 100) : 0;
    content += createDetailCategory('식단', '#f97316', dietCompleted, dietTotal, dietPercent);
    
    // 수면
    const sleepIds = challengeData.sleep.map(s => s.id);
    let sleepCompleted = 0;
    let sleepTotal = sleepIds.length;
    
    if (challenges.sleep) {
        sleepIds.forEach(id => {
            if (challenges.sleep[id] && challenges.sleep[id].includes(dateStr)) {
                sleepCompleted++;
            }
        });
    }
    
    const sleepPercent = sleepTotal > 0 ? Math.round((sleepCompleted / sleepTotal) * 100) : 0;
    content += createDetailCategory('수면', '#8b5cf6', sleepCompleted, sleepTotal, sleepPercent);
    
    // 자유
    const customChallenges = getCustomChallenges();
    const customIds = customChallenges.map(c => c.id);
    let customCompleted = 0;
    let customTotal = customIds.length;
    
    if (challenges.custom && customTotal > 0) {
        customIds.forEach(id => {
            if (challenges.custom[id] && challenges.custom[id].includes(dateStr)) {
                customCompleted++;
            }
        });
        
        const customPercent = Math.round((customCompleted / customTotal) * 100);
        content += createDetailCategory('자유', '#ec4899', customCompleted, customTotal, customPercent);
    }
    
    if (content === '') {
        content = '<div style="color: var(--text-light); font-size: 0.875rem;">이 날은 기록이 없습니다.</div>';
    }
    
    document.getElementById('detailContent').innerHTML = content;
    detailDiv.style.display = 'block';
    
    // 상세 정보로 스크롤
    setTimeout(() => {
        detailDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// 상세 정보 카테고리 HTML 생성
function createDetailCategory(name, color, completed, total, percent) {
    return `
        <div class="detail-category">
            <div class="detail-category-title">
                <div class="detail-category-icon" style="background: ${color};"></div>
                ${name}
            </div>
            <div class="detail-progress">
                <div class="detail-progress-bar">
                    <div class="detail-progress-fill" style="background: ${color}; width: ${percent}%;"></div>
                </div>
                <div class="detail-progress-text">${completed}/${total}</div>
            </div>
        </div>
    `;
}
