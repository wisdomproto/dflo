// 치료 사례 데이터
const casesData = [
    {
        id: 1,
        name: '김OO',
        gender: '남아',
        age: '초등학교 5학년',
        beforeHeight: 132.5,
        afterHeight: 148.2,
        growth: 15.7,
        duration: '18개월',
        description: '키가 또래보다 작아 고민이 많았던 김OO 학생. 성장판 검사 후 맞춤형 성장 프로그램을 시작했습니다.',
        treatment: '성장호르몬 치료와 함께 규칙적인 운동, 영양 관리, 수면 습관 개선을 병행했습니다.',
        result: '18개월 동안 15.7cm 성장하여 반 평균 키에 도달했습니다. 현재도 꾸준히 관리 중입니다.',
        progress: [
            { date: '2023.03', text: '치료 시작 - 키 132.5cm (P10 미만)' },
            { date: '2023.09', text: '6개월 후 - 키 139.8cm (7.3cm 성장)' },
            { date: '2024.03', text: '12개월 후 - 키 144.5cm (12cm 성장)' },
            { date: '2024.09', text: '18개월 후 - 키 148.2cm (15.7cm 성장, P50 도달)' }
        ]
    },
    {
        id: 2,
        name: '이OO',
        gender: '여아',
        age: '중학교 1학년',
        beforeHeight: 145.3,
        afterHeight: 158.9,
        growth: 13.6,
        duration: '24개월',
        description: '초경 이후 성장이 멈출까 걱정했던 이OO 학생. 골연령 검사 결과 아직 성장 가능성이 있었습니다.',
        treatment: '바른 자세 교정, 성장판 자극 운동, 칼슘과 단백질 중심의 영양 관리를 진행했습니다.',
        result: '24개월 동안 13.6cm 성장하여 목표 키를 달성했습니다. 자신감도 함께 커졌습니다.',
        progress: [
            { date: '2022.09', text: '치료 시작 - 키 145.3cm' },
            { date: '2023.03', text: '6개월 후 - 키 149.7cm (4.4cm 성장)' },
            { date: '2023.09', text: '12개월 후 - 키 153.2cm (7.9cm 성장)' },
            { date: '2024.03', text: '18개월 후 - 키 156.5cm (11.2cm 성장)' },
            { date: '2024.09', text: '24개월 후 - 키 158.9cm (13.6cm 성장)' }
        ]
    },
    {
        id: 3,
        name: '박OO',
        gender: '남아',
        age: '초등학교 6학년',
        beforeHeight: 140.8,
        afterHeight: 159.4,
        growth: 18.6,
        duration: '20개월',
        description: '가족력상 키가 작은 편이었던 박OO 학생. 적극적인 관리로 가족 평균 키를 뛰어넘었습니다.',
        treatment: '매일 줄넘기 500개, 주 3회 수영, 밤 10시 이전 취침 습관을 만들었습니다.',
        result: '20개월 동안 18.6cm라는 놀라운 성장을 보였습니다. 꾸준한 실천이 만든 결과입니다.',
        progress: [
            { date: '2023.01', text: '치료 시작 - 키 140.8cm (P3 미만)' },
            { date: '2023.07', text: '6개월 후 - 키 148.2cm (7.4cm 성장)' },
            { date: '2024.01', text: '12개월 후 - 키 153.9cm (13.1cm 성장)' },
            { date: '2024.09', text: '20개월 후 - 키 159.4cm (18.6cm 성장, P50 초과)' }
        ]
    },
    {
        id: 4,
        name: '최OO',
        gender: '여아',
        age: '초등학교 4학년',
        beforeHeight: 128.2,
        afterHeight: 142.5,
        growth: 14.3,
        duration: '15개월',
        description: '편식이 심하고 운동을 싫어했던 최OO 학생. 생활 습관 개선으로 건강하게 성장했습니다.',
        treatment: '재미있는 운동 프로그램으로 흥미를 유발하고, 영양사와 함께 식단을 개선했습니다.',
        result: '15개월 동안 14.3cm 성장했으며, 편식 습관도 많이 개선되었습니다.',
        progress: [
            { date: '2023.06', text: '치료 시작 - 키 128.2cm' },
            { date: '2023.12', text: '6개월 후 - 키 134.8cm (6.6cm 성장)' },
            { date: '2024.06', text: '12개월 후 - 키 139.7cm (11.5cm 성장)' },
            { date: '2024.09', text: '15개월 후 - 키 142.5cm (14.3cm 성장)' }
        ]
    }
];

// 페이지 로드
document.addEventListener('DOMContentLoaded', function() {
    renderCases();
});

// 사례 렌더링
function renderCases() {
    const container = document.getElementById('casesGrid');
    container.innerHTML = casesData.map(caseData => `
        <div class="case-card" onclick="openModal(${caseData.id})">
            <div class="case-header">
                <div class="case-badge">${caseData.gender}</div>
                <h3 class="case-title">${caseData.name} 학생</h3>
                <p class="case-age">${caseData.age}</p>
            </div>
            <div class="case-body">
                <div class="case-stats">
                    <div class="case-stat-item">
                        <div class="case-stat-label">치료 전</div>
                        <div class="case-stat-value">${caseData.beforeHeight}cm</div>
                    </div>
                    <div class="case-stat-item">
                        <div class="case-stat-label">성장량</div>
                        <div class="case-stat-value highlight">+${caseData.growth}cm</div>
                    </div>
                    <div class="case-stat-item">
                        <div class="case-stat-label">치료 후</div>
                        <div class="case-stat-value">${caseData.afterHeight}cm</div>
                    </div>
                </div>
                <p class="case-description">${caseData.description}</p>
                <div class="case-footer">
                    <span class="case-duration">📅 ${caseData.duration} 치료</span>
                    <button class="btn-view-case" onclick="event.stopPropagation(); openModal(${caseData.id})">
                        자세히 보기
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 모달 열기
function openModal(id) {
    const caseData = casesData.find(c => c.id === id);
    if (!caseData) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="case-badge">${caseData.gender}</div>
            <h2>${caseData.name} 학생의 성장 스토리</h2>
            <p>${caseData.age} · ${caseData.duration} 치료</p>
        </div>
        <div class="modal-body">
            <div class="modal-section">
                <h3>📊 성장 결과</h3>
                <div class="case-stats">
                    <div class="case-stat-item">
                        <div class="case-stat-label">치료 전</div>
                        <div class="case-stat-value">${caseData.beforeHeight}cm</div>
                    </div>
                    <div class="case-stat-item">
                        <div class="case-stat-label">성장량</div>
                        <div class="case-stat-value highlight">+${caseData.growth}cm</div>
                    </div>
                    <div class="case-stat-item">
                        <div class="case-stat-label">치료 후</div>
                        <div class="case-stat-value">${caseData.afterHeight}cm</div>
                    </div>
                </div>
            </div>
            
            <div class="modal-section">
                <h3>📝 치료 과정</h3>
                <p>${caseData.treatment}</p>
            </div>
            
            <div class="modal-section">
                <h3>📈 성장 타임라인</h3>
                <div class="progress-timeline">
                    ${caseData.progress.map(item => `
                        <div class="progress-item">
                            <div class="progress-date">${item.date}</div>
                            <div class="progress-text">${item.text}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="modal-section">
                <h3>✨ 치료 결과</h3>
                <p>${caseData.result}</p>
            </div>
        </div>
    `;
    
    document.getElementById('caseModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 모달 닫기
function closeModal() {
    document.getElementById('caseModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});
