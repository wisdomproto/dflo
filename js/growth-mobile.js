// 성장 진단 모바일 스크립트
let growthChart = null;
let currentChartType = 'height';
let currentGender = 'male';

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('date').value = getTodayDate();
    
    // 선택된 아이 확인
    const selectedChild = StorageManager.getSelectedChild();
    if (selectedChild) {
        // 아이의 성별에 맞게 그래프 초기화
        currentGender = selectedChild.gender;
    }
    
    loadChildrenList();
    updateChildInfo();
    loadRecords();
    createChart();
});

// 아이 변경 이벤트 리스너
window.addEventListener('childChanged', function() {
    const selectedChild = StorageManager.getSelectedChild();
    if (selectedChild) {
        currentGender = selectedChild.gender;
    }
    loadChildrenList();
    updateChildInfo();
    loadRecords();
    updateChart();
});

// 아이 목록 로드 (성장 진단용)
function loadChildrenList() {
    console.log('🔍 [loadChildrenList] 시작');
    
    const children = StorageManager.getChildren();
    console.log('📋 [loadChildrenList] StorageManager에서 가져온 아이:', children.length, '명');
    console.log('📋 [loadChildrenList] 아이 데이터:', children);
    
    const selectedChildId = StorageManager.getSelectedChildId();
    console.log('🎯 [loadChildrenList] 선택된 아이 ID:', selectedChildId);
    
    const container = document.getElementById('childrenListGrowth');
    
    if (!container) {
        console.error('❌ [loadChildrenList] childrenListGrowth 컨테이너를 찾을 수 없습니다!');
        return;
    }
    
    if (children.length === 0) {
        console.warn('⚠️ [loadChildrenList] 아이 데이터가 비어있습니다.');
        container.innerHTML = `
            <div style="text-align: center; padding: 12px; color: #9ca3af; font-size: 0.875rem; width: 100%;">
                아이를 추가해주세요
            </div>
        `;
        return;
    }
    
    console.log('✅ [loadChildrenList] 아이 목록 UI 생성 중...');
    
    container.innerHTML = children.map(child => {
        const isSelected = child.id === selectedChildId;
        const genderIcon = child.gender === 'male' ? '👦' : '👧';
        const age = calculateAge(child.birthDate);
        
        return `
            <button 
                onclick="selectChildInGrowth('${child.id}')"
                style="
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    border-radius: 20px;
                    border: 2px solid ${isSelected ? '#14b8a6' : '#e5e7eb'};
                    background: ${isSelected ? '#f0fdfa' : 'white'};
                    color: ${isSelected ? '#14b8a6' : '#6b7280'};
                    font-size: 0.875rem;
                    font-weight: ${isSelected ? '600' : '500'};
                    cursor: pointer;
                    transition: all 0.2s;
                "
            >
                <span>${genderIcon}</span>
                <span>${child.name}</span>
                <span style="font-size: 0.75rem; opacity: 0.8;">${age}세</span>
            </button>
        `;
    }).join('');
    
    console.log('✅ [loadChildrenList] 아이 목록 UI 생성 완료');
}

// 아이 선택 (성장 진단)
function selectChildInGrowth(childId) {
    StorageManager.setSelectedChild(childId);
    
    // 이벤트 발생
    window.dispatchEvent(new Event('childChanged'));
}

// 아이 정보 자동 설정 (성별, 나이)
function updateChildInfo() {
    const selectedChild = StorageManager.getSelectedChild();
    
    if (selectedChild) {
        // 성별 자동 설정 (hidden input)
        document.getElementById('gender').value = selectedChild.gender;
        
        // 현재 날짜 기준으로 나이 자동 계산
        updateAgeByDate();
        
        // 성별 화면에 표시
        const genderIcon = selectedChild.gender === 'male' ? '👦' : '👧';
        const genderText = selectedChild.gender === 'male' ? '남아' : '여아';
        
        const genderDisplay = document.getElementById('childGenderDisplay');
        
        if (genderDisplay) {
            genderDisplay.textContent = `${genderIcon} ${genderText}`;
            genderDisplay.style.background = selectedChild.gender === 'male' 
                ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' 
                : 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)';
            genderDisplay.style.borderColor = selectedChild.gender === 'male' ? '#3b82f6' : '#ec4899';
        }
    } else {
        document.getElementById('gender').value = '';
        document.getElementById('age').value = '';
        
        const genderDisplay = document.getElementById('childGenderDisplay');
        const ageDisplay = document.getElementById('childAgeDisplay');
        
        if (genderDisplay) {
            genderDisplay.textContent = '-';
            genderDisplay.style.background = 'var(--bg-color)';
            genderDisplay.style.borderColor = 'var(--border-color)';
        }
        
        if (ageDisplay) {
            ageDisplay.textContent = '-';
            ageDisplay.style.background = 'var(--bg-color)';
            ageDisplay.style.borderColor = 'var(--border-color)';
        }
    }
}

// 날짜 변경 시 나이 자동 계산
function updateAgeByDate() {
    const selectedChild = StorageManager.getSelectedChild();
    const dateInput = document.getElementById('date');
    const ageDisplay = document.getElementById('childAgeDisplay');
    
    if (!selectedChild || !dateInput.value) {
        if (ageDisplay) {
            ageDisplay.textContent = '-';
            ageDisplay.style.background = 'var(--bg-color)';
            ageDisplay.style.borderColor = 'var(--border-color)';
        }
        return;
    }
    
    // birth_date와 birthDate 호환성 처리
    const birthDate = selectedChild.birthDate || selectedChild.birth_date;
    if (!birthDate) {
        console.error('생년월일 정보가 없습니다:', selectedChild);
        if (ageDisplay) {
            ageDisplay.textContent = '-';
        }
        return;
    }
    
    // 선택된 날짜 기준으로 나이 계산
    const targetDate = new Date(dateInput.value);
    const age = calculateAgeAtDate(birthDate, targetDate);
    
    // hidden input에 저장
    document.getElementById('age').value = age;
    
    // 화면에 표시
    if (ageDisplay) {
        ageDisplay.textContent = `만 ${age}세`;
        ageDisplay.style.background = 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)';
        ageDisplay.style.borderColor = 'var(--primary-color)';
    }
}

// 특정 날짜 기준 만 나이 계산 (소수점 포함)
function calculateAgeAtDate(birthDate, targetDate) {
    const birth = new Date(birthDate);
    
    // 연도 차이
    let age = targetDate.getFullYear() - birth.getFullYear();
    
    // 월/일 차이로 보정
    const monthDiff = targetDate.getMonth() - birth.getMonth();
    const dayDiff = targetDate.getDate() - birth.getDate();
    
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
    }
    
    // 소수점 계산 (대략적인 월 단위)
    let monthsPassed = monthDiff;
    if (dayDiff < 0) {
        monthsPassed--;
    }
    if (monthsPassed < 0) {
        monthsPassed += 12;
    }
    
    const decimal = (monthsPassed / 12).toFixed(1);
    const finalAge = age + parseFloat(decimal.substring(1)); // "0.5" -> 0.5
    
    return finalAge.toFixed(1);
}

// 만 나이 계산 (소수점 포함)
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    
    // 연도 차이
    let age = today.getFullYear() - birth.getFullYear();
    
    // 월/일 차이로 보정
    const monthDiff = today.getMonth() - birth.getMonth();
    const dayDiff = today.getDate() - birth.getDate();
    
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        age--;
    }
    
    // 소수점 계산 (대략적인 월 단위)
    let monthsPassed = monthDiff;
    if (dayDiff < 0) {
        monthsPassed--;
    }
    if (monthsPassed < 0) {
        monthsPassed += 12;
    }
    
    const decimal = (monthsPassed / 12).toFixed(1);
    const finalAge = age + parseFloat(decimal.substring(1)); // "0.5" -> 0.5
    
    return finalAge.toFixed(1);
}

function handleSubmit(event) {
    event.preventDefault();
    
    // 선택된 아이 확인
    const selectedChild = StorageManager.getSelectedChild();
    if (!selectedChild) {
        alert('⚠️ 먼저 홈 화면에서 아이를 선택해주세요!');
        return;
    }
    
    const record = {
        date: document.getElementById('date').value,
        gender: document.getElementById('gender').value,
        age: parseFloat(document.getElementById('age').value),
        height: parseFloat(document.getElementById('height').value),
        weight: parseFloat(document.getElementById('weight').value)
    };
    
    console.log('저장할 기록:', record);
    console.log('선택된 아이:', selectedChild);
    
    StorageManager.saveGrowthRecord(record);
    
    // 저장 확인 - 로컬스토리지 직접 확인
    const rawData = localStorage.getItem('growthRecords');
    console.log('로컬스토리지 원본:', rawData);
    console.log('선택된 아이 ID:', selectedChild.id);
    
    const savedRecords = StorageManager.getGrowthRecords();
    console.log('저장 후 전체 기록:', savedRecords);
    console.log('getGrowthRecords 반환값 타입:', typeof savedRecords, Array.isArray(savedRecords));
    
    document.getElementById('growthForm').reset();
    document.getElementById('date').value = getTodayDate();
    
    // 아이 정보 다시 표시
    updateChildInfo();
    
    loadRecords();
    updateChart();
    
    alert('✅ 성장 기록이 저장되었습니다!');
}

async function loadRecords() {
    const selectedChild = StorageManager.getSelectedChild();
    const records = StorageManager.getGrowthRecords();
    const container = document.getElementById('recordsList');
    
    console.log('loadRecords 호출됨, 기록 개수:', records.length);
    
    if (!container) {
        console.error('recordsList 요소를 찾을 수 없습니다!');
        return;
    }
    
    if (records.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div>기록이 없습니다</div>
            </div>
        `;
        return;
    }
    
    // 나이 오름차순 정렬 (어린 나이부터 표시)
    records.sort((a, b) => a.age - b.age);
    
    // 한국 표준 성장도표 로드
    if (!koreaGrowthStandard.isLoaded) {
        try {
            await koreaGrowthStandard.loadData();
        } catch (error) {
            console.error('성장도표 로드 실패:', error);
        }
    }
    
    // 각 기록에 예측키 추가
    const recordsWithPrediction = await Promise.all(records.map(async (record) => {
        let prediction = null;
        
        if (record.age < 18 && koreaGrowthStandard.isLoaded) {
            try {
                prediction = koreaGrowthStandard.predictAdultHeight(
                    record.height,
                    record.age,
                    record.gender
                );
            } catch (error) {
                console.error('예측 실패:', error);
            }
        }
        
        return { ...record, prediction };
    }));
    
    container.innerHTML = recordsWithPrediction.map((record, index) => {
        const genderText = record.gender === 'male' ? '남아 👦' : '여아 👧';
        
        // 메모 HTML
        const notesHTML = record.notes ? `
            <div class="record-notes" style="margin-top: 12px; padding: 8px 12px; background: #f9fafb; border-radius: 8px; border-left: 3px solid #14b8a6;">
                <div style="font-size: 0.75rem; font-weight: 600; color: #6b7280; margin-bottom: 4px;">📝 메모</div>
                <div style="font-size: 0.875rem; color: #374151; line-height: 1.5;">${record.notes}</div>
            </div>
        ` : '';
        
        // 예측키 칸 HTML (3번째 칸에 표시)
        let thirdStatHTML = '';
        if (record.prediction) {
            thirdStatHTML = `
                <div class="record-stat">
                    <div class="record-stat-label" style="display: flex; align-items: center; gap: 4px;">
                        예상 최종 키 (18세)
                        <button onclick="showPredictionMethodModal('korea-standard'); event.stopPropagation();" style="background: rgba(120, 53, 15, 0.15); border: none; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.65rem; color: #78350f; padding: 0;">
                            ?
                        </button>
                    </div>
                    <div class="record-stat-value" style="color: #f59e0b; font-weight: 700;">
                        ${record.prediction.predictedHeight}cm
                    </div>
                    <div style="font-size: 0.65rem; color: #9ca3af; margin-top: 2px;">
                        현재 ${record.prediction.percentile.toFixed(1)}% 유지 시
                    </div>
                </div>
            `;
        } else {
            // 18세 이상이거나 예측 실패 시 빈 칸
            thirdStatHTML = `
                <div class="record-stat">
                    <div class="record-stat-label">-</div>
                    <div class="record-stat-value" style="color: #9ca3af;">-</div>
                </div>
            `;
        }
        
        return `
            <div class="record-item" data-index="${index}">
                <div class="record-header">
                    <div class="record-date">${record.date}</div>
                    <div class="record-badge">${genderText} ${record.age}세</div>
                </div>
                <div class="record-stats">
                    <div class="record-stat">
                        <div class="record-stat-label">키</div>
                        <div class="record-stat-value" style="color: var(--primary-color);">${record.height}cm</div>
                    </div>
                    <div class="record-stat">
                        <div class="record-stat-label">몸무게</div>
                        <div class="record-stat-value" style="color: var(--secondary-color);">${record.weight}kg</div>
                    </div>
                    ${thirdStatHTML}
                </div>
                ${notesHTML}
                <button class="btn-delete" onclick="deleteRecord(${index})">🗑️ 삭제</button>
            </div>
        `;
    }).join('');
    
    // 스크롤 하이라이트 설정
    setupScrollHighlight();
}

function deleteRecord(index) {
    if (confirm('이 기록을 삭제하시겠습니까?')) {
        const records = StorageManager.getGrowthRecords();
        // 나이 오름차순 정렬 (어린 나이부터 표시)
    records.sort((a, b) => a.age - b.age);
        
        const allRecords = StorageManager.getGrowthRecords();
        const recordToDelete = records[index];
        const originalIndex = allRecords.findIndex(r => 
            r.date === recordToDelete.date && 
            r.age === recordToDelete.age && 
            r.height === recordToDelete.height
        );
        
        StorageManager.deleteGrowthRecord(originalIndex);
        loadRecords();
        updateChart();
    }
}

function createChart() {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    
    // 성별 탭 숨기기 (선택된 아이의 성별만 표시)
    const genderTabContainer = document.querySelector('.gender-tab').parentElement;
    if (genderTabContainer) {
        genderTabContainer.style.display = 'none';
    }
    
    growthChart = new Chart(ctx, {
        type: 'line',
        data: { datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        padding: 8,
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    enabled: false  // 툴팁 비활성화
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: '나이 (세)',
                        font: { size: 11 }
                    },
                    min: 2,
                    max: 18,
                    ticks: { 
                        font: { size: 10 },
                        stepSize: 2
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: currentChartType === 'height' ? '키 (cm)' : '몸무게 (kg)',
                        font: { size: 11 }
                    },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });
    
    updateChart();
}

function updateChart() {
    if (!growthChart) return;
    
    const records = StorageManager.getGrowthRecords();
    const genderRecords = records.filter(r => r.gender === currentGender).sort((a, b) => a.age - b.age);
    
    const datasets = [];
    const genderData = growthData[currentGender][currentChartType];
    const color = currentGender === 'male' ? '59, 130, 246' : '236, 72, 153';
    const label = currentGender === 'male' ? '남아' : '여아';
    
    // 백분위선
    datasets.push(
        {
            label: `${label} P95`,
            data: genderData.map(d => ({ x: d.age, y: d.p95 })),
            borderColor: `rgba(${color}, 0.25)`,
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 0,
            fill: false,
            tension: 0.4
        },
        {
            label: `${label} P90`,
            data: genderData.map(d => ({ x: d.age, y: d.p90 })),
            borderColor: `rgba(${color}, 0.35)`,
            borderWidth: 1.5,
            borderDash: [2, 2],
            pointRadius: 0,
            fill: false,
            tension: 0.4
        },
        {
            label: `${label} P75`,
            data: genderData.map(d => ({ x: d.age, y: d.p75 })),
            borderColor: `rgba(${color}, 0.5)`,
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.4
        },
        {
            label: `${label} P50`,
            data: genderData.map(d => ({ x: d.age, y: d.p50 })),
            borderColor: `rgba(${color}, 0.85)`,
            borderWidth: 3,
            pointRadius: 0,
            fill: false,
            tension: 0.4
        },
        {
            label: `${label} P25`,
            data: genderData.map(d => ({ x: d.age, y: d.p25 })),
            borderColor: `rgba(${color}, 0.5)`,
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.4
        },
        {
            label: `${label} P10`,
            data: genderData.map(d => ({ x: d.age, y: d.p10 })),
            borderColor: `rgba(${color}, 0.35)`,
            borderWidth: 1.5,
            borderDash: [2, 2],
            pointRadius: 0,
            fill: false,
            tension: 0.4
        },
        {
            label: `${label} P5`,
            data: genderData.map(d => ({ x: d.age, y: d.p5 })),
            borderColor: `rgba(${color}, 0.25)`,
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 0,
            fill: false,
            tension: 0.4
        }
    );
    
    // 사용자 데이터
    if (genderRecords.length > 0) {
        const userColor = currentGender === 'male' ? '#3b82f6' : '#ec4899';
        datasets.push({
            label: `우리 아이`,
            data: genderRecords.map(r => ({
                x: r.age,
                y: currentChartType === 'height' ? r.height : r.weight
            })),
            borderColor: userColor,
            backgroundColor: userColor,
            borderWidth: 3,
            pointRadius: genderRecords.map(() => 10),
            pointHoverRadius: genderRecords.map(() => 12),
            pointBackgroundColor: genderRecords.map(() => userColor),
            pointBorderColor: genderRecords.map(() => '#ffffff'),
            pointBorderWidth: genderRecords.map(() => 3),
            tension: 0.3,
            order: 0  // 사용자 데이터를 구별하기 위한 order 속성
        });
    }
    
    growthChart.data.datasets = datasets;
    growthChart.options.scales.y.title.text = currentChartType === 'height' ? '키 (cm)' : '몸무게 (kg)';
    growthChart.update();
}

function switchChart(type) {
    currentChartType = type;
    
    document.querySelectorAll('.chart-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll(`[data-chart="${type}"]`).forEach(btn => {
        btn.classList.add('active');
    });
    
    updateChart();
}

function switchGender(gender) {
    // 성별 전환 기능 비활성화 (선택된 아이의 성별로 고정)
    // currentGender는 선택된 아이의 성별로 자동 설정됨
    return;
}

// 입력 탭 전환
function switchInputTab(tab) {
    // 탭 버튼 활성화
    document.querySelectorAll('.input-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll(`[data-tab="${tab}"]`).forEach(btn => {
        btn.classList.add('active');
    });
    
    // 콘텐츠 전환
    document.querySelectorAll('.input-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-input`).classList.add('active');
    
    // 차트와 기록 섹션 표시/숨김
    const chartSection = document.querySelector('.chart-section');
    const recordsSection = document.querySelector('.records-section');
    
    if (tab === 'record') {
        // 성장 기록 탭: 차트와 기록 표시
        if (chartSection) chartSection.style.display = 'block';
        if (recordsSection) recordsSection.style.display = 'block';
    } else {
        // 예상키 측정 탭: 차트와 기록 숨김
        if (chartSection) chartSection.style.display = 'none';
        if (recordsSection) recordsSection.style.display = 'none';
    }
}

// Khamis-Roche 예상키 측정 (두 방법 통합)
async function handlePrediction(event) {
    event.preventDefault();
    
    const gender = document.getElementById('child-gender').value;
    const age = parseFloat(document.getElementById('child-age').value);
    const height = parseFloat(document.getElementById('child-height').value);
    const weight = parseFloat(document.getElementById('child-weight').value);
    const fatherHeight = parseFloat(document.getElementById('father-height').value);
    const motherHeight = parseFloat(document.getElementById('mother-height').value);
    
    // 1. Khamis-Roche 방법으로 계산
    const khamisRocheHeight = calculateKhamisRoche(gender, age, height, weight, fatherHeight, motherHeight);
    
    // 유전적 예상키 계산 (중간 부모 키)
    let geneticHeight;
    if (gender === 'male') {
        geneticHeight = (fatherHeight + motherHeight + 13) / 2;
    } else {
        geneticHeight = (fatherHeight + motherHeight - 13) / 2;
    }
    
    // 2. 한국 표준 성장도표 방법으로 계산
    let koreaStandardHeight = null;
    let currentPercentile = null;
    
    try {
        if (!koreaGrowthStandard.isLoaded) {
            await koreaGrowthStandard.loadData();
        }
        
        const prediction = koreaGrowthStandard.predictAdultHeight(height, age, gender);
        if (prediction) {
            koreaStandardHeight = prediction.predictedHeight;
            currentPercentile = prediction.percentile;
        }
    } catch (error) {
        console.error('한국 표준 예측 실패:', error);
    }
    
    // 결과 표시
    const resultDiv = document.getElementById('predictionResult');
    const predictedHeightDiv = document.getElementById('predictedHeight');
    const predictedRangeDiv = document.getElementById('predictedRange');
    
    let resultHTML = '';
    
    if (koreaStandardHeight) {
        // 두 방법 모두 표시
        const avgHeight = (khamisRocheHeight + koreaStandardHeight) / 2;
        
        resultHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 8px;">통합 예측 (평균)</div>
                <div style="font-size: 2.5rem; font-weight: 700; color: #10b981; margin-bottom: 4px;">
                    ${avgHeight.toFixed(1)} cm
                </div>
                <div style="font-size: 0.875rem; color: #6b7280;">
                    두 방법의 평균값
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 16px; border-radius: 12px; position: relative;">
                    <button onclick="showPredictionMethodModal('khamis-roche')" style="position: absolute; top: 8px; right: 8px; background: rgba(120, 53, 15, 0.1); border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.75rem; color: #78350f;">
                        ?
                    </button>
                    <div style="font-size: 0.75rem; color: #78350f; margin-bottom: 8px; font-weight: 600;">
                        Khamis-Roche
                    </div>
                    <div style="font-size: 1.75rem; font-weight: 700; color: #78350f; margin-bottom: 4px;">
                        ${khamisRocheHeight.toFixed(1)}
                    </div>
                    <div style="font-size: 0.7rem; color: #92400e;">
                        cm
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 16px; border-radius: 12px; position: relative;">
                    <button onclick="showPredictionMethodModal('korea-standard')" style="position: absolute; top: 8px; right: 8px; background: rgba(30, 64, 175, 0.1); border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.75rem; color: #1e40af;">
                        ?
                    </button>
                    <div style="font-size: 0.75rem; color: #1e40af; margin-bottom: 8px; font-weight: 600;">
                        한국 표준
                    </div>
                    <div style="font-size: 1.75rem; font-weight: 700; color: #1e40af; margin-bottom: 4px;">
                        ${koreaStandardHeight.toFixed(1)}
                    </div>
                    <div style="font-size: 0.7rem; color: #1e3a8a;">
                        cm
                    </div>
                </div>
            </div>
            
            <div style="background: #f9fafb; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="font-size: 0.875rem; font-weight: 600; color: #1f2937; margin-bottom: 12px;">
                    📊 현재 성장 상태
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 0.875rem;">
                    <div>
                        <div style="color: #6b7280; font-size: 0.75rem; margin-bottom: 4px;">현재 키</div>
                        <div style="font-weight: 700; color: #1f2937;">${height} cm</div>
                    </div>
                    <div>
                        <div style="color: #6b7280; font-size: 0.75rem; margin-bottom: 4px;">백분위</div>
                        <div style="font-weight: 700; color: #3b82f6;">${currentPercentile.toFixed(1)}%</div>
                    </div>
                    <div>
                        <div style="color: #6b7280; font-size: 0.75rem; margin-bottom: 4px;">중간 부모 키</div>
                        <div style="font-weight: 700; color: #1f2937;">${geneticHeight.toFixed(1)} cm</div>
                    </div>
                </div>
            </div>
            
            <div style="background: #dcfce7; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="font-size: 0.875rem; font-weight: 600; color: #14532d; margin-bottom: 8px;">
                    ✅ 통합 예측의 장점
                </div>
                <div style="font-size: 0.8rem; color: #15803d; line-height: 1.6;">
                    • <strong>Khamis-Roche</strong>: 부모 키와 현재 성장 상태 반영<br>
                    • <strong>한국 표준</strong>: 한국 아동 성장 패턴 반영<br>
                    • <strong>통합 예측</strong>: 두 방법의 장점을 결합하여 더 높은 신뢰도
                </div>
            </div>
            
            <button onclick="showPredictionMethodModal('combined')" style="width: 100%; padding: 12px; background: white; border: 2px solid #10b981; border-radius: 12px; color: #10b981; font-weight: 600; cursor: pointer;">
                📊 예측 방법 자세히 보기
            </button>
        `;
        
        predictedHeightDiv.innerHTML = resultHTML;
        predictedRangeDiv.style.display = 'none';
        
    } else {
        // Khamis-Roche만 표시
        const minHeight = (khamisRocheHeight - 5).toFixed(1);
        const maxHeight = (khamisRocheHeight + 5).toFixed(1);
        
        predictedHeightDiv.textContent = `${khamisRocheHeight.toFixed(1)} cm`;
        predictedRangeDiv.innerHTML = `
            <div style="font-size: 0.875rem; margin-bottom: 8px;">
                예상 범위: ${minHeight} ~ ${maxHeight} cm
            </div>
            <div style="font-size: 0.75rem; opacity: 0.8;">
                중간 부모 키: ${geneticHeight.toFixed(1)} cm
            </div>
        `;
        predictedRangeDiv.style.display = 'block';
    }
    
    resultDiv.style.display = 'block';
    
    // 결과로 부드럽게 스크롤
    setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

/**
 * Khamis-Roche 방법으로 예상 최종 키 계산
 * 
 * 한국형 간이 계산식 (한국 소아청소년 성장 데이터 기반)
 * 
 * @param {string} gender - 성별 ('male' 또는 'female')
 * @param {number} age - 현재 나이 (만 나이, 4-17세)
 * @param {number} height - 현재 키 (cm)
 * @param {number} weight - 현재 몸무게 (kg)
 * @param {number} fatherHeight - 아버지 키 (cm)
 * @param {number} motherHeight - 어머니 키 (cm)
 * @returns {number} 예상 최종 키 (cm)
 */
function calculateKhamisRoche(gender, age, height, weight, fatherHeight, motherHeight) {
    // 1. 유전적 예상 키 (부모 평균키 기반)
    let geneticHeight;
    if (gender === 'male') {
        // 남아 = (아버지키 + 어머니키 + 13) / 2
        geneticHeight = (fatherHeight + motherHeight + 13) / 2;
    } else {
        // 여아 = (아버지키 + 어머니키 - 13) / 2
        geneticHeight = (fatherHeight + motherHeight - 13) / 2;
    }
    
    // 2. 현재 성장 상태 평가 (백분위 기반 보정)
    // KCDC 2017 표준 데이터에서 현재 키의 백분위 확인
    const currentPercentile = getCurrentPercentileValue(gender, age, height);
    
    // 3. 최종 예상키 = 유전적 키 × (1 + 현재 성장 상태 보정치)
    // 현재 백분위가 높으면 유전적 예상보다 더 클 가능성
    const growthAdjustment = (currentPercentile - 50) * 0.01; // -0.5 ~ +0.5
    let predictedHeight = geneticHeight * (1 + growthAdjustment * 0.05);
    
    // 4. 나이별 신뢰도 조정
    // 나이가 많을수록 현재 키에 더 가중치
    const ageWeight = age < 12 ? 0.3 : (age < 15 ? 0.5 : 0.7);
    const expectedHeightAtAge = getExpectedHeightAtAge(gender, age, geneticHeight);
    const heightDifference = height - expectedHeightAtAge;
    
    predictedHeight += heightDifference * ageWeight;
    
    return Math.round(predictedHeight * 10) / 10; // 소수점 1자리
}

/**
 * 현재 키의 백분위 값을 계산 (0-100)
 */
function getCurrentPercentileValue(gender, age, height) {
    const data = growthData[gender]['height'];
    
    // 가장 가까운 나이의 데이터 찾기
    let closestData = data[0];
    let minDiff = Math.abs(data[0].age - age);
    
    for (let i = 1; i < data.length; i++) {
        const diff = Math.abs(data[i].age - age);
        if (diff < minDiff) {
            minDiff = diff;
            closestData = data[i];
        }
    }
    
    // 백분위 추정 (선형 보간)
    if (height <= closestData.p5) return 5;
    if (height <= closestData.p10) return 5 + (height - closestData.p5) / (closestData.p10 - closestData.p5) * 5;
    if (height <= closestData.p25) return 10 + (height - closestData.p10) / (closestData.p25 - closestData.p10) * 15;
    if (height <= closestData.p50) return 25 + (height - closestData.p25) / (closestData.p50 - closestData.p25) * 25;
    if (height <= closestData.p75) return 50 + (height - closestData.p50) / (closestData.p75 - closestData.p50) * 25;
    if (height <= closestData.p90) return 75 + (height - closestData.p75) / (closestData.p90 - closestData.p75) * 15;
    if (height <= closestData.p95) return 90 + (height - closestData.p90) / (closestData.p95 - closestData.p90) * 5;
    return 95;
}

/**
 * 특정 나이에서 유전적 예상키가 얼마나 되어야 하는지 계산
 */
function getExpectedHeightAtAge(gender, age, finalHeight) {
    // 18세 최종 키 대비 현재 나이의 성장률
    const growthRates = {
        male: {
            4: 0.68, 5: 0.71, 6: 0.74, 7: 0.77, 8: 0.80,
            9: 0.83, 10: 0.86, 11: 0.88, 12: 0.90, 13: 0.93,
            14: 0.96, 15: 0.98, 16: 0.99, 17: 0.995, 18: 1.0
        },
        female: {
            4: 0.70, 5: 0.73, 6: 0.76, 7: 0.79, 8: 0.82,
            9: 0.85, 10: 0.88, 11: 0.92, 12: 0.96, 13: 0.98,
            14: 0.99, 15: 0.995, 16: 0.998, 17: 1.0, 18: 1.0
        }
    };
    
    const ageInt = Math.floor(age);
    const rate = growthRates[gender][ageInt] || 1.0;
    
    return finalHeight * rate;
}

// 예측 방법 설명 모달 표시
function showPredictionMethodModal(method) {
    const modal = document.getElementById('predictionMethodModal');
    const content = document.getElementById('predictionMethodContent');
    
    let html = '';
    
    if (method === 'korea-standard') {
        html = `
            <div style="padding: 20px;">
                <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                    <div style="font-size: 1.125rem; font-weight: 700; color: #1e40af; margin-bottom: 8px;">
                        📊 한국 표준 성장도표 방법
                    </div>
                    <div style="font-size: 0.875rem; color: #1e3a8a; line-height: 1.6;">
                        대한소아과학회 2017 한국 소아청소년 성장도표를 활용한 예측 방법입니다.
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 12px;">
                        🔬 산출 근거
                    </h4>
                    <div style="background: #f9fafb; padding: 16px; border-radius: 12px; border-left: 4px solid #3b82f6;">
                        <ol style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                            <li><strong>현재 백분위 계산</strong><br>
                                LMS 방법으로 현재 키가 같은 나이 또래 중 몇 %인지 정확히 계산합니다.</li>
                            <li style="margin-top: 12px;"><strong>18세 예측키 산출</strong><br>
                                현재 백분위가 18세까지 유지된다고 가정하고, 18세 성장도표에서 같은 백분위에 해당하는 키를 찾습니다.</li>
                            <li style="margin-top: 12px;"><strong>예측 범위</strong><br>
                                현재 백분위 ±10% 범위의 18세 키를 예측 범위로 제공합니다.</li>
                        </ol>
                    </div>
                </div>
                
                <div style="background: #fee2e2; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 0.875rem; font-weight: 600; color: #991b1b; margin-bottom: 8px;">
                        ⚠️ 참고사항
                    </div>
                    <div style="font-size: 0.875rem; color: #991b1b; line-height: 1.6;">
                        • 현재 성장 추세가 유지된다는 가정 하에 예측합니다.<br>
                        • 실제 최종 키는 영양, 운동, 수면 등 환경적 요인에 따라 달라질 수 있습니다.
                    </div>
                </div>
            </div>
        `;
    }
    
    content.innerHTML = html;
    modal.style.display = 'flex';
}

// 예측 방법 설명 모달 닫기
function closePredictionMethodModal() {
    document.getElementById('predictionMethodModal').style.display = 'none';
}

// 스크롤 하이라이트 설정
function setupScrollHighlight() {
    // 페이지 전체 스크롤 이벤트 감지
    window.removeEventListener('scroll', handleRecordScroll);
    window.addEventListener('scroll', handleRecordScroll);
    
    // 초기 하이라이트
    setTimeout(() => {
        handleRecordScroll();
    }, 100);
}

// 스크롤 핸들러
function handleRecordScroll() {
    const chartSection = document.querySelector('.chart-section-fixed');
    const recordCards = document.querySelectorAll('.record-item');
    
    if (!chartSection || recordCards.length === 0) return;
    
    const chartRect = chartSection.getBoundingClientRect();
    const chartBottom = chartRect.bottom;
    const triggerY = chartBottom + 20; // 차트 하단에서 20px 아래
    
    let activeIndex = -1;
    let minDistance = Infinity;
    
    // 트리거 라인에 가장 가까운 카드 찾기
    recordCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardTop = rect.top;
        const distance = Math.abs(cardTop - triggerY);
        
        if (cardTop >= triggerY - 100 && distance < minDistance) {
            minDistance = distance;
            activeIndex = index;
        }
    });
    
    // 모든 카드의 하이라이트 제거
    recordCards.forEach(card => card.classList.remove('highlighted'));
    
    // 활성 카드 하이라이트
    if (activeIndex !== -1 && activeIndex < recordCards.length) {
        recordCards[activeIndex].classList.add('highlighted');
        updateChartHighlight(activeIndex);
    } else {
        // 활성 카드가 없으면 첫 번째 카드 하이라이트
        if (recordCards.length > 0) {
            recordCards[0].classList.add('highlighted');
            updateChartHighlight(0);
        }
    }
}

// 차트 포인트 하이라이트
function updateChartHighlight(highlightIndex) {
    if (!growthChart) return;
    
    // 사용자 데이터 데이터셋 찾기 (order === 0)
    const userDataset = growthChart.data.datasets.find(ds => ds.order === 0);
    
    if (!userDataset || !userDataset.data || userDataset.data.length === 0) return;
    
    const userColor = currentGender === 'male' ? '#3b82f6' : '#ec4899';
    
    // 모든 포인트 색상 초기화
    userDataset.pointBackgroundColor = userDataset.data.map(() => userColor);
    userDataset.pointBorderColor = userDataset.data.map(() => '#ffffff');
    userDataset.pointRadius = userDataset.data.map(() => 10);
    userDataset.pointHoverRadius = userDataset.data.map(() => 12);
    userDataset.pointBorderWidth = userDataset.data.map(() => 3);
    
    // 하이라이트 포인트 색상 변경 (노란색)
    if (highlightIndex >= 0 && highlightIndex < userDataset.data.length) {
        userDataset.pointBackgroundColor[highlightIndex] = '#fbbf24'; // 밝은 노란색
        userDataset.pointBorderColor[highlightIndex] = '#ffffff';
        userDataset.pointRadius[highlightIndex] = 14;
        userDataset.pointHoverRadius[highlightIndex] = 16;
        userDataset.pointBorderWidth[highlightIndex] = 4;
    }
    
    // 애니메이션 없이 즉시 업데이트
    growthChart.update('none');
}

