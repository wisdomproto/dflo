// 치료 사례 모바일 스크립트
let caseChart = null;

// 초기 데이터 로드 (merge 옵션 추가)
async function loadInitialCasesData(merge = false, forceReload = false) {
    console.log('📊 치료 사례 초기 데이터 로드 시도...');
    try {
        const existingCases = localStorage.getItem('adminCases');
        const existing = existingCases ? JSON.parse(existingCases) : [];
        console.log('📊 기존 localStorage 사례:', existing.length + '개');
        
        // forceReload=true면 기존 데이터 무시하고 강제 재로드
        if (forceReload) {
            console.log('🔄 강제 재로드 모드: 기존 데이터 무시');
        }
        
        // merge=true면 기존 데이터에 추가, false면 비어있을 때만 로드, forceReload=true면 무조건 로드
        if (forceReload || merge || existing.length === 0) {
            console.log('📊 data/cases.json 파일 로드 시도...');
            const response = await fetch('data/cases.json');
            console.log('📊 Fetch 응답 상태:', response.status, response.statusText);
            
            if (response.ok) {
                const newCases = await response.json();
                
                if (forceReload) {
                    // 강제 재로드: 기존 데이터 무시하고 새 데이터로 교체
                    localStorage.setItem('adminCases', JSON.stringify(newCases));
                    console.log('✅ 강제 재로드 완료:', newCases.length, '개');
                } else if (merge && existing.length > 0) {
                    // 기존 데이터와 병합 (업데이트 + 추가)
                    const merged = [...existing];
                    let updatedCount = 0;
                    let addedCount = 0;
                    
                    newCases.forEach(newCase => {
                        // 이름과 생년월일이 같은 경우 찾기
                        const existingIndex = merged.findIndex(c => 
                            c.name === newCase.name && c.birthDate === newCase.birthDate
                        );
                        
                        if (existingIndex >= 0) {
                            // 기존 데이터를 새 데이터로 업데이트 (덮어쓰기)
                            merged[existingIndex] = newCase;
                            updatedCount++;
                            console.log('🔄 업데이트:', newCase.name);
                        } else {
                            // 새 데이터 추가
                            merged.push(newCase);
                            addedCount++;
                            console.log('➕ 추가:', newCase.name);
                        }
                    });
                    
                    localStorage.setItem('adminCases', JSON.stringify(merged));
                    console.log('✅ 치료 사례 병합 완료:', merged.length, '개 (업데이트', updatedCount, '+ 추가', addedCount, ')');
                } else {
                    // 기존 데이터 없음 - 새로 로드
                    localStorage.setItem('adminCases', JSON.stringify(newCases));
                    console.log('✅ 치료 사례 초기 데이터 로드 완료:', newCases.length, '개');
                }
                return true;
            } else {
                console.error('❌ 사례 파일 로드 실패:', response.status);
            }
        } else {
            console.log('ℹ️ 기존 사례 데이터 사용');
        }
    } catch (error) {
        console.error('❌ 치료 사례 초기 데이터 로드 에러:', error);
    }
    return false;
}

document.addEventListener('DOMContentLoaded', async function() {
    // 한국 표준 성장도표 데이터 로드
    if (window.koreaGrowthStandard && !window.koreaGrowthStandard.isLoaded) {
        try {
            await window.koreaGrowthStandard.loadData();
            console.log('✅ 치료 사례: 한국 표준 성장도표 로드 완료');
        } catch (error) {
            console.error('❌ 치료 사례: 한국 표준 성장도표 로드 실패:', error);
        }
    }
    
    // 🆕 항상 최신 데이터를 병합 (merge=true)
    await loadInitialCasesData(true);
    renderCases();
    
    // URL 파라미터 확인: auto=true이면 sessionStorage의 사례 자동 열기
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auto') === 'true') {
        const selectedCaseData = sessionStorage.getItem('selectedCase');
        if (selectedCaseData) {
            try {
                const caseItem = JSON.parse(selectedCaseData);
                // 사례 인덱스 찾기
                const adminCases = JSON.parse(localStorage.getItem('adminCases') || '[]');
                const index = adminCases.findIndex(c => 
                    c.name === caseItem.name && c.birthDate === caseItem.birthDate
                );
                if (index >= 0) {
                    // 약간의 딜레이 후 모달 열기 (렌더링 완료 보장)
                    setTimeout(() => {
                        openModal(index);
                        // sessionStorage 클리어
                        sessionStorage.removeItem('selectedCase');
                        // URL 파라미터 제거
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }, 300);
                }
            } catch (error) {
                console.error('❌ 자동 모달 열기 실패:', error);
            }
        }
    }
});

function renderCases() {
    // 관리자가 추가한 사례 불러오기
    const adminCases = JSON.parse(localStorage.getItem('adminCases') || '[]');
    const container = document.getElementById('casesContainer');
    const loadButton = document.getElementById('loadSampleDataButton');
    
    if (adminCases.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div>등록된 치료 사례가 없습니다</div>
                <p style="color: var(--text-light); font-size: 0.875rem; margin-top: 8px;">
                    샘플 데이터를 로드하거나 관리자 페이지에서 사례를 추가해주세요
                </p>
            </div>
        `;
        // 로드 버튼 표시
        if (loadButton) loadButton.style.display = 'block';
        return;
    }
    
    // 데이터가 있으면 로드 버튼 숨기기
    if (loadButton) loadButton.style.display = 'none';
    
    container.innerHTML = adminCases.map((caseData, index) => {
        const genderText = caseData.gender === 'male' ? '남아' : '여아';
        const measurements = caseData.measurements || [];
        
        if (measurements.length === 0) return '';
        
        // 첫 번째와 마지막 측정
        const first = measurements[0];
        const last = measurements[measurements.length - 1];
        const growth = (last.height - first.height).toFixed(1);
        
        // 치료 기간 계산
        const startDate = new Date(first.date);
        const endDate = new Date(last.date);
        const months = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24 * 30));
        const duration = months > 0 ? `${months}개월` : '진행중';
        
        return `
            <div class="case-card touchable" onclick="openModal(${index})">
                <div class="case-header">
                    <div class="case-badge">${genderText}</div>
                    <div class="case-title">${caseData.name}</div>
                </div>
                <div class="case-body">
                    <div class="case-stats">
                        <div class="case-stat">
                            <div class="case-stat-label">치료 전</div>
                            <div class="case-stat-value">${first.height}cm</div>
                        </div>
                        <div class="case-stat">
                            <div class="case-stat-label">성장량</div>
                            <div class="case-stat-value highlight">+${growth}cm</div>
                        </div>
                        <div class="case-stat">
                            <div class="case-stat-label">치료 후</div>
                            <div class="case-stat-value">${last.height}cm</div>
                        </div>
                    </div>
                    ${caseData.memo ? `<p class="case-description">${caseData.memo.substring(0, 100)}${caseData.memo.length > 100 ? '...' : ''}</p>` : ''}
                    <div class="case-footer">📅 ${duration} 치료 · ${measurements.length}회 측정</div>
                </div>
            </div>
        `;
    }).join('');
}

async function openModal(index) {
    // 한국 표준 성장도표 데이터 로드 확인
    if (window.koreaGrowthStandard && !window.koreaGrowthStandard.isLoaded) {
        try {
            console.log('📊 한국 표준 성장도표 로딩 중...');
            await window.koreaGrowthStandard.loadData();
            console.log('✅ 한국 표준 성장도표 로드 완료');
        } catch (error) {
            console.error('❌ 한국 표준 성장도표 로드 실패:', error);
        }
    }
    
    const adminCases = JSON.parse(localStorage.getItem('adminCases') || '[]');
    const caseData = adminCases[index];
    if (!caseData) return;
    
    // 🐛 디버그: 데이터 확인
    console.log('📋 전체 환자 데이터:', caseData);
    console.log('👨 아버지 키:', caseData.fatherHeight);
    console.log('👩 어머니 키:', caseData.motherHeight);
    console.log('🎯 희망 키:', caseData.targetHeight);
    console.log('💡 특이사항:', caseData.specialNotes);
    console.log('📅 첫 내원:', caseData.firstVisit);
    
    const genderText = caseData.gender === 'male' ? '남아' : '여아';
    const measurements = caseData.measurements || [];
    
    if (measurements.length === 0) return;
    
    const first = measurements[0];
    const last = measurements[measurements.length - 1];
    const growth = (last.height - first.height).toFixed(1);
    
    // 치료 기간
    const startDate = new Date(first.date);
    const endDate = new Date(last.date);
    const months = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24 * 30));
    const duration = months > 0 ? `${months}개월` : '진행중';
    
    const age = calculateAgeAtDate(caseData.birthDate, first.date);
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="modal-header">
            <div class="case-badge">${genderText}</div>
            <h2>${caseData.name}</h2>
            <p><span>만 ${age}세</span><span>${duration} 치료</span></p>
        </div>
        
        <!-- 고정 그래프 영역 -->
        <div class="sticky-chart-container">
            <!-- 환자 기본 정보 -->
            <div class="patient-info-section">
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">👨 아버지 키</span>
                        <span class="info-value">${caseData.fatherHeight || caseData.father || '-'}cm</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">👩 어머니 키</span>
                        <span class="info-value">${caseData.motherHeight || caseData.mother || '-'}cm</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">🎯 희망 키</span>
                        <span class="info-value">${caseData.targetHeight || '-'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">📅 첫 내원</span>
                        <span class="info-value">${caseData.firstVisit ? caseData.firstVisit.age : '만 ' + age + '세'}</span>
                    </div>
                </div>
                ${caseData.specialNotes ? `
                    <div class="special-notes">
                        <span class="notes-icon">💡</span>
                        <span class="notes-text">${caseData.specialNotes}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="modal-section chart-section">
                <h3>📈 성장 그래프</h3>
                <div class="chart-wrapper" style="height: 280px;">
                    <canvas id="caseGrowthChart"></canvas>
                </div>
            </div>
        </div>
        
        <!-- 스크롤 가능한 컨텐츠 영역 -->
        <div class="modal-body scrollable-content" id="scrollableContent">
            <div class="modal-section">
                <h3>📊 성장 결과 요약</h3>
                <div class="case-stats">
                    <div class="case-stat">
                        <div class="case-stat-label">치료 전</div>
                        <div class="case-stat-value">${first.height}cm</div>
                    </div>
                    <div class="case-stat">
                        <div class="case-stat-label">성장량</div>
                        <div class="case-stat-value highlight">+${growth}cm</div>
                    </div>
                    <div class="case-stat">
                        <div class="case-stat-label">치료 후</div>
                        <div class="case-stat-value">${last.height}cm</div>
                    </div>
                </div>
            </div>
            
            <div class="modal-section">
                <h3>📅 날짜별 측정 기록 (${measurements.length}회)</h3>
                <p style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 12px;">
                    💡 회차를 스크롤하면 그래프에서 해당 포인트가 강조됩니다
                </p>
                <div class="measurements-timeline" id="measurementsTimeline">
                    ${measurements.map((m, i) => {
                        const mAge = calculateAgeAtDate(caseData.birthDate, m.date);
                        const growthFromPrev = i === 0 ? '' : `+${(m.height - measurements[i-1].height).toFixed(1)}cm`;
                        
                        // 회차별 메모 추출
                        const memo = m.memo || '';
                        
                        // 예측키 계산 (18세 미만일 때만)
                        let predictionHTML = '';
                        console.log(`🔍 예측키 계산 체크 - 나이: ${mAge}세, 키: ${m.height}cm, 성별: ${caseData.gender}`);
                        console.log(`🔍 koreaGrowthStandard 존재:`, !!window.koreaGrowthStandard);
                        console.log(`🔍 koreaGrowthStandard 로드됨:`, window.koreaGrowthStandard?.isLoaded);
                        
                        if (mAge < 18 && window.koreaGrowthStandard && window.koreaGrowthStandard.isLoaded) {
                            try {
                                const prediction = window.koreaGrowthStandard.predictAdultHeight(
                                    m.height,
                                    mAge,
                                    caseData.gender === '남' ? 'male' : 'female'
                                );
                                
                                console.log(`✅ 예측키 계산 완료:`, prediction);
                                
                                if (prediction) {
                                    predictionHTML = `
                                        <div class="record-stat">
                                            <div class="stat-label">
                                                예상 최종 키 (18세)
                                                <button class="help-icon" onclick="showPredictionMethodModal(); event.stopPropagation();" style="margin-left: 4px;">?</button>
                                            </div>
                                            <div class="stat-value" style="color: #f59e0b; font-size: 1.1rem; font-weight: 600;">
                                                ${prediction.predictedHeight}cm
                                            </div>
                                            <div style="font-size: 0.65rem; color: #9ca3af; margin-top: 2px;">
                                                현재 ${prediction.percentile.toFixed(1)}% 유지 시
                                            </div>
                                        </div>
                                    `;
                                }
                            } catch (error) {
                                console.error('❌ 예측 실패:', error);
                            }
                        } else {
                            console.log(`⚠️ 예측키 조건 불만족 - 나이: ${mAge}세 (18세 미만: ${mAge < 18}), 로드: ${window.koreaGrowthStandard?.isLoaded}`);
                        }
                        
                        return `
                            <div class="measurement-card" data-index="${i}">
                                <div class="record-header">
                                    <div class="record-badge">
                                        <span style="font-size: 1.2rem; font-weight: 700;">${i + 1}</span>
                                        <span style="font-size: 0.75rem; opacity: 0.8;">회차</span>
                                    </div>
                                    <div class="record-info">
                                        <div style="font-size: 0.875rem; color: var(--text-primary);">${m.date}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-light); margin-top: 2px;">
                                            ${caseData.gender === '남' ? '남아 👦' : '여아 👧'} 만 ${mAge}세
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="record-stats">
                                    <div class="record-stat">
                                        <div class="stat-label">키</div>
                                        <div class="stat-value">
                                            ${m.height}cm
                                            ${growthFromPrev ? `<div style="font-size: 0.7rem; color: #10b981; margin-top: 2px;">${growthFromPrev}</div>` : ''}
                                        </div>
                                    </div>
                                    
                                    <div class="record-stat">
                                        <div class="stat-label">몸무게</div>
                                        <div class="stat-value">${m.weight}kg</div>
                                    </div>
                                    
                                    ${predictionHTML || `
                                        <div class="record-stat">
                                            <div class="stat-label">예상 최종 키 (18세)</div>
                                            <div class="stat-value" style="color: #9ca3af;">-</div>
                                        </div>
                                    `}
                                </div>
                                
                                ${memo ? `
                                    <div class="measurement-memo">
                                        <div class="memo-icon">📝</div>
                                        <div class="memo-text">${memo}</div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            ${caseData.memo ? `
                <div class="modal-section">
                    <h3>📝 종합 치료 메모</h3>
                    <div class="memo-box">
                        <p style="white-space: pre-wrap; line-height: 1.8;">${caseData.memo}</p>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('caseModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // 모달이 열린 후 차트 생성 (약간의 딜레이를 주어 렌더링 완료 보장)
    setTimeout(() => {
        createCaseGrowthChart(caseData);
        
        // 스크롤 이벤트 리스너 추가
        setupScrollHighlight(caseData);
    }, 100);
}

// 스크롤 하이라이트 설정
function setupScrollHighlight(caseData) {
    const modalBody = document.getElementById('modalBody');
    const scrollableContent = document.getElementById('scrollableContent');
    const measurementCards = document.querySelectorAll('.measurement-card');
    
    if (!modalBody || measurementCards.length === 0) return;
    
    let currentHighlightIndex = -1;
    
    // modalBody에 스크롤 이벤트 추가
    modalBody.addEventListener('scroll', () => {
        // 각 카드의 위치를 modalBody 기준으로 확인
        const modalBodyRect = modalBody.getBoundingClientRect();
        
        // 🎯 하이라이트 트리거 위치: 화면 상단에서 50% 지점 (화면 중앙)
        // (카드가 화면 중앙에 오면 하이라이트)
        const triggerPoint = modalBodyRect.height * 0.50;
        
        // 스크롤 위치에 따라 어느 카드가 보이는지 확인
        let newHighlightIndex = -1;
        let minDistance = Infinity;
        
        measurementCards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            
            // modalBody의 상단으로부터 카드 상단까지의 거리
            const cardTop = cardRect.top - modalBodyRect.top;
            
            // 트리거 포인트와 카드 상단의 거리
            const distance = Math.abs(cardTop - triggerPoint);
            
            // 카드가 보이는 영역에 있고, 트리거 포인트에 가장 가까운 카드
            if (cardRect.top < modalBodyRect.bottom && cardRect.bottom > modalBodyRect.top) {
                if (distance < minDistance) {
                    minDistance = distance;
                    newHighlightIndex = index;
                }
            }
        });
        
        // 하이라이트 인덱스가 변경되었을 때만 업데이트
        if (newHighlightIndex !== currentHighlightIndex && newHighlightIndex !== -1) {
            currentHighlightIndex = newHighlightIndex;
            
            // 카드 하이라이트 업데이트
            measurementCards.forEach((card, index) => {
                if (index === currentHighlightIndex) {
                    card.classList.add('highlighted');
                } else {
                    card.classList.remove('highlighted');
                }
            });
            
            // 그래프 포인트 하이라이트 업데이트
            updateChartHighlight(currentHighlightIndex);
            
            // 디버그 로그
            console.log(`📍 하이라이트: ${currentHighlightIndex + 1}회차 (50% 화면중앙)`);
        }
    });
    
    // 초기 하이라이트 (첫 번째 카드)
    if (measurementCards.length > 0) {
        measurementCards[0].classList.add('highlighted');
        updateChartHighlight(0);
        console.log('✅ 초기 하이라이트: 1회차 (50% 화면중앙 모드)');
    }
}

// 차트 포인트 하이라이트 업데이트
function updateChartHighlight(highlightIndex) {
    if (!caseChart) return;
    
    // 실제 성장 기록 데이터셋 찾기 (마지막 데이터셋)
    const datasets = caseChart.data.datasets;
    const patientDatasetIndex = datasets.length - 1; // 마지막이 환자 데이터
    const dataset = datasets[patientDatasetIndex];
    
    if (!dataset || !dataset.data || dataset.data.length === 0) {
        console.error('환자 데이터셋을 찾을 수 없습니다.');
        return;
    }
    
    console.log(`차트 업데이트: ${highlightIndex + 1}회차 (총 ${dataset.data.length}개 포인트)`);
    
    // 모든 포인트 초기화
    const originalPointRadius = 5;
    const highlightPointRadius = 9;
    const originalPointBorderWidth = 2;
    const highlightPointBorderWidth = 3;
    
    // pointRadius와 pointBorderWidth를 배열로 설정
    dataset.pointRadius = dataset.data.map((_, index) => 
        index === highlightIndex ? highlightPointRadius : originalPointRadius
    );
    
    dataset.pointBorderWidth = dataset.data.map((_, index) => 
        index === highlightIndex ? highlightPointBorderWidth : originalPointBorderWidth
    );
    
    // 하이라이트된 포인트의 색상 변경
    dataset.pointBackgroundColor = dataset.data.map((_, index) => 
        index === highlightIndex ? '#f59e0b' : '#ef4444'  // 주황색 vs 빨간색
    );
    
    dataset.pointBorderColor = dataset.data.map((_, index) => 
        index === highlightIndex ? '#ffffff' : '#ffffff'
    );
    
    dataset.pointHoverRadius = dataset.data.map((_, index) => 
        index === highlightIndex ? 16 : 10
    );
    
    // 차트 업데이트
    caseChart.update('none'); // 애니메이션 없이 즉시 업데이트
}

function closeModal() {
    document.getElementById('caseModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // 차트 파괴
    if (caseChart) {
        caseChart.destroy();
        caseChart = null;
    }
}

// 특정 날짜 기준 만 나이 계산
function calculateAgeAtDate(birthDate, measureDate) {
    const measure = new Date(measureDate);
    const birth = new Date(birthDate);
    
    // 연도 차이 계산
    let years = measure.getFullYear() - birth.getFullYear();
    
    // 월 차이 계산
    let months = measure.getMonth() - birth.getMonth();
    
    // 일 차이 계산
    let days = measure.getDate() - birth.getDate();
    
    // 일수가 음수면 한 달 빼기
    if (days < 0) {
        months--;
        // 이전 달의 마지막 날 구하기
        const prevMonth = new Date(measure.getFullYear(), measure.getMonth(), 0);
        days += prevMonth.getDate();
    }
    
    // 월수가 음수면 한 해 빼기
    if (months < 0) {
        years--;
        months += 12;
    }
    
    // 소수점 포함 나이 계산 (월 + 일/30으로 근사)
    const decimalAge = years + (months + days / 30) / 12;
    
    return decimalAge.toFixed(1);
}

// 성장 곡선 차트 생성
function createCaseGrowthChart(caseData) {
    // 기존 차트가 있으면 파괴
    if (caseChart) {
        caseChart.destroy();
    }
    
    const canvas = document.getElementById('caseGrowthChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // 환자 데이터 준비
    const patientData = caseData.measurements.map(m => ({
        x: parseFloat(calculateAgeAtDate(caseData.birthDate, m.date)),
        y: m.height
    }));
    
    // 표준 성장 곡선 데이터 (KCDC 2017)
    const standardData = getStandardGrowthData(caseData.gender);
    
    caseChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                // 표준 곡선들
                ...standardData,
                // 환자 데이터
                {
                    label: `${caseData.name}의 성장 기록`,
                    data: patientData,
                    borderColor: '#ef4444',
                    backgroundColor: '#ef4444',
                    borderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: '만 나이 (세)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: 2,
                    max: 18
                },
                y: {
                    title: {
                        display: true,
                        text: '키 (cm)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    min: 80,
                    max: 190
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    enabled: false  // 툴팁 비활성화
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// 표준 성장 데이터 가져오기 (KCDC 2017)
function getStandardGrowthData(gender) {
    const percentiles = ['P5', 'P50', 'P95'];
    const colors = {
        'P5': '#93c5fd',
        'P50': '#3b82f6',
        'P95': '#1e40af'
    };
    
    return percentiles.map(p => ({
        label: p,
        data: heightPercentileData[gender][p].map((height, index) => ({
            x: parseFloat(heightPercentileData.ages[index]),
            y: height
        })),
        borderColor: colors[p],
        backgroundColor: 'transparent',
        borderWidth: p === 'P50' ? 3 : 2,
        borderDash: p === 'P50' ? [] : [5, 5],
        pointRadius: 0,
        tension: 0.4,
        fill: false
    }));
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// 샘플 사례 데이터 강제 로드 (사용자가 버튼 클릭 시)
async function loadSampleCasesData() {
    console.log('📊 샘플 사례 데이터 강제 로드 시작...');
    
    try {
        const response = await fetch('data/cases.json');
        
        if (response.ok) {
            const cases = await response.json();
            localStorage.setItem('adminCases', JSON.stringify(cases));
            console.log('✅ 샘플 사례 데이터 로드 완료:', cases.length, '개');
            alert(`✅ ${cases.length}개의 샘플 치료 사례가 로드되었습니다!`);
            renderCases();
        } else {
            console.error('❌ 샘플 데이터 로드 실패:', response.status);
            alert('❌ 샘플 데이터 로드에 실패했습니다. 관리자에게 문의해주세요.');
        }
    } catch (error) {
        console.error('❌ 샘플 데이터 로드 에러:', error);
        alert('❌ 샘플 데이터 로드 중 오류가 발생했습니다.');
    }
}

// 예측 방법 설명 모달 표시
function showPredictionMethodModal(method) {
    // 간단한 alert로 표시 (또는 별도 모달 생성 가능)
    const message = `
📊 한국 표준 성장도표 방법

【산출 근거】
1️⃣ 현재 백분위 계산
   LMS 방법으로 현재 키가 같은 나이 또래 중 몇 %인지 정확히 계산합니다.

2️⃣ 18세 예측키 산출
   현재 백분위가 18세까지 유지된다고 가정하고, 18세 성장도표에서 같은 백분위에 해당하는 키를 찾습니다.

3️⃣ 예측 범위
   현재 백분위 ±10% 범위의 18세 키를 예측 범위로 제공합니다.

⚠️ 참고사항
• 현재 성장 추세가 유지된다는 가정 하에 예측합니다.
• 실제 최종 키는 영양, 운동, 수면 등 환경적 요인에 따라 달라질 수 있습니다.
    `.trim();
    
    alert(message);
}
