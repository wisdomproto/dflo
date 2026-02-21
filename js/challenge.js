// 챌린지 관리
let currentTab = 'exercise';

document.addEventListener('DOMContentLoaded', function() {
    initializeChallenges();
    updateStreakDisplay();
});

// 챌린지 초기화
function initializeChallenges() {
    renderPostureExercises();
    renderGrowthExercises();
    renderDietChallenges();
    renderSleepChallenges();
    renderCustomChallenges();
}

// 바른자세 운동 렌더링
function renderPostureExercises() {
    const container = document.getElementById('postureExercises');
    container.innerHTML = challengeData.exercise.posture.map(exercise => 
        createChallengeCard('exercise', exercise)
    ).join('');
}

// 성장판 자극 운동 렌더링
function renderGrowthExercises() {
    const container = document.getElementById('growthExercises');
    container.innerHTML = challengeData.exercise.growth.map(exercise => 
        createChallengeCard('exercise', exercise)
    ).join('');
}

// 식단 챌린지 렌더링
function renderDietChallenges() {
    const container = document.getElementById('dietChallenges');
    container.innerHTML = challengeData.diet.map(challenge => 
        createChallengeCard('diet', challenge)
    ).join('');
}

// 수면 챌린지 렌더링
function renderSleepChallenges() {
    const container = document.getElementById('sleepChallenges');
    container.innerHTML = challengeData.sleep.map(challenge => 
        createChallengeCard('sleep', challenge)
    ).join('');
}

// 자유 챌린지 렌더링
function renderCustomChallenges() {
    const customChallenges = getCustomChallenges();
    const container = document.getElementById('customChallenges');
    
    if (customChallenges.length === 0) {
        container.innerHTML = '<p class="empty-state">아직 추가한 챌린지가 없습니다.</p>';
        return;
    }
    
    container.innerHTML = customChallenges.map((challenge, index) => {
        const isCompleted = isChallengeCompleted('custom', challenge.id);
        const stats = getChallengeStats('custom', challenge.id);
        
        return `
            <div class="challenge-card ${isCompleted ? 'completed' : ''}" data-category="custom" data-id="${challenge.id}">
                <div class="challenge-header">
                    <div class="challenge-icon">✨</div>
                    <div class="challenge-check" onclick="toggleChallenge('custom', '${challenge.id}')">
                        ${isCompleted ? '✓' : ''}
                    </div>
                </div>
                <h3 class="challenge-title">${challenge.title}</h3>
                <div class="challenge-actions">
                    <button class="btn-delete-challenge" onclick="deleteCustomChallenge('${challenge.id}')">삭제</button>
                </div>
                <div class="challenge-stats">
                    <div class="stat-item">
                        <span>완료: <strong>${stats.completed}회</strong></span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 챌린지 카드 생성
function createChallengeCard(category, challenge) {
    const isCompleted = isChallengeCompleted(category, challenge.id);
    const stats = getChallengeStats(category, challenge.id);
    
    return `
        <div class="challenge-card ${isCompleted ? 'completed' : ''}" data-category="${category}" data-id="${challenge.id}">
            <div class="challenge-header">
                <div class="challenge-icon">${challenge.icon}</div>
                <div class="challenge-check" onclick="toggleChallenge('${category}', '${challenge.id}')">
                    ${isCompleted ? '✓' : ''}
                </div>
            </div>
            <h3 class="challenge-title">${challenge.title}</h3>
            <p class="challenge-description">${challenge.description}</p>
            ${challenge.videoUrl ? `
                <div class="challenge-actions">
                    <a href="${challenge.videoUrl}" target="_blank" class="btn-video">
                        ▶️ 동영상 보기
                    </a>
                </div>
            ` : ''}
            <div class="challenge-stats">
                <div class="stat-item">
                    <span>완료: <strong>${stats.completed}회</strong></span>
                </div>
            </div>
        </div>
    `;
}

// 탭 전환
function switchTab(tab) {
    currentTab = tab;
    
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    // 탭 콘텐츠 표시
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// 챌린지 완료 토글
function toggleChallenge(category, id) {
    const today = getTodayDate();
    const challenges = StorageManager.getChallenges();
    
    if (!challenges[category]) {
        challenges[category] = {};
    }
    
    if (!challenges[category][id]) {
        challenges[category][id] = [];
    }
    
    const index = challenges[category][id].indexOf(today);
    
    if (index > -1) {
        // 오늘 이미 완료했으면 취소
        challenges[category][id].splice(index, 1);
    } else {
        // 오늘 완료 추가
        challenges[category][id].push(today);
    }
    
    localStorage.setItem('challenges', JSON.stringify(challenges));
    
    // 화면 업데이트
    initializeChallenges();
    updateStreakDisplay();
}

// 챌린지 완료 여부 확인
function isChallengeCompleted(category, id) {
    const challenges = StorageManager.getChallenges();
    const today = getTodayDate();
    
    return challenges[category]?.[id]?.includes(today) || false;
}

// 챌린지 통계
function getChallengeStats(category, id) {
    const challenges = StorageManager.getChallenges();
    const completions = challenges[category]?.[id] || [];
    
    return {
        completed: completions.length,
        lastCompleted: completions.length > 0 ? completions[completions.length - 1] : null
    };
}

// 연속 일수 업데이트
function updateStreakDisplay() {
    const stats = StorageManager.getStats();
    const streakElement = document.getElementById('streakDays');
    if (streakElement) {
        animateNumber(streakElement, 0, stats.challengeStreak, 1000);
    }
}

// 자유 챌린지 추가
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

// 자유 챌린지 삭제
function deleteCustomChallenge(id) {
    if (!confirm('이 챌린지를 삭제하시겠습니까?')) return;
    
    let customChallenges = getCustomChallenges();
    customChallenges = customChallenges.filter(c => c.id !== id);
    localStorage.setItem('customChallenges', JSON.stringify(customChallenges));
    
    // 완료 기록도 삭제
    const challenges = StorageManager.getChallenges();
    if (challenges.custom && challenges.custom[id]) {
        delete challenges.custom[id];
        localStorage.setItem('challenges', JSON.stringify(challenges));
    }
    
    renderCustomChallenges();
}

// 자유 챌린지 가져오기
function getCustomChallenges() {
    return JSON.parse(localStorage.getItem('customChallenges') || '[]');
}
