// ===== 환자 관리 시스템 =====

// 전역 변수
let patients = [];
let currentPatient = null;
let currentFilter = 'all';
let searchQuery = '';

// 로컬스토리지 키
const STORAGE_KEY = 'admin_patients';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 환자 관리 시스템 초기화');
    loadPatients();
    renderPatientsList();
    updateStats();
});

// ===== 데이터 로드 & 저장 =====

function loadPatients() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        patients = JSON.parse(stored);
        console.log(`✅ 환자 ${patients.length}명 로드됨`);
    } else {
        // 샘플 데이터 로드
        loadSamplePatients();
    }
}

function savePatients() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
    console.log(`💾 환자 ${patients.length}명 저장됨`);
}

function loadSamplePatients() {
    patients = [
        {
            id: generateId(),
            name: '김민준',
            gender: 'male',
            birthDate: '2011-01-25',
            chartNumber: 'P2024001',
            parentPhone: '010-1234-5678',
            fatherHeight: 172,
            motherHeight: 160,
            targetHeight: 180,
            specialNotes: '알레르기: 없음\n특이사항: 활동적, 농구 좋아함',
            status: 'completed',
            measurements: [
                { id: generateId(), date: '2023-04-25', height: 155.7, weight: 58.6, boneAge: null, predictedHeight: null, memo: '치료 시작' },
                { id: generateId(), date: '2023-11-07', height: 161.6, weight: 63.1, boneAge: null, predictedHeight: null, memo: '성장호르몬 검사 완료' },
                { id: generateId(), date: '2024-04-13', height: 166.4, weight: 70.1, boneAge: null, predictedHeight: null, memo: '6개월차 - 성장 5.9cm' },
                { id: generateId(), date: '2024-10-19', height: 172.0, weight: 76.9, boneAge: null, predictedHeight: null, memo: '1년차 - 누적 10.7cm' },
                { id: generateId(), date: '2025-01-20', height: 174.8, weight: 78.5, boneAge: null, predictedHeight: null, memo: '치료 종료 - 목표 달성' }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: generateId(),
            name: '이서연',
            gender: 'female',
            birthDate: '2013-05-15',
            chartNumber: 'P2024002',
            parentPhone: '010-2345-6789',
            fatherHeight: 168,
            motherHeight: 158,
            targetHeight: 165,
            specialNotes: '편식 있음 (채소)\n주 3회 수영',
            status: 'ongoing',
            measurements: [
                { id: generateId(), date: '2024-08-01', height: 148.5, weight: 42.0, boneAge: 10.5, predictedHeight: 163.0, memo: '초진 - 저신장 소견' },
                { id: generateId(), date: '2024-11-01', height: 151.2, weight: 44.5, boneAge: null, predictedHeight: null, memo: '3개월차 - 2.7cm 성장' }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    savePatients();
    console.log('🎨 샘플 환자 데이터 로드됨');
}

// ===== 검색 & 필터 =====

function searchPatients() {
    searchQuery = document.getElementById('patientSearch').value.toLowerCase();
    renderPatientsList();
}

function filterPatients(filter) {
    currentFilter = filter;
    
    // 필터 버튼 활성화 상태 변경
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderPatientsList();
}

function getFilteredPatients() {
    let filtered = patients;
    
    // 검색어 필터
    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchQuery) ||
            (p.chartNumber && p.chartNumber.toLowerCase().includes(searchQuery))
        );
    }
    
    // 카테고리 필터
    if (currentFilter !== 'all') {
        if (currentFilter === 'male' || currentFilter === 'female') {
            filtered = filtered.filter(p => p.gender === currentFilter);
        } else if (currentFilter === 'ongoing') {
            filtered = filtered.filter(p => p.status === 'ongoing');
        }
    }
    
    return filtered;
}

// ===== 통계 업데이트 =====

function updateStats() {
    const total = patients.length;
    const ongoing = patients.filter(p => p.status === 'ongoing').length;
    const male = patients.filter(p => p.gender === 'male').length;
    const female = patients.filter(p => p.gender === 'female').length;
    
    document.getElementById('totalPatients').textContent = total;
    document.getElementById('ongoingPatients').textContent = ongoing;
    document.getElementById('malePatients').textContent = male;
    document.getElementById('femalePatients').textContent = female;
}

// ===== 환자 목록 렌더링 =====

function renderPatientsList() {
    const container = document.getElementById('patientsList');
    const filtered = getFilteredPatients();
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <div class="empty-state-text">환자가 없습니다</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(patient => {
        const age = calculateAge(patient.birthDate);
        const genderIcon = patient.gender === 'male' ? '👦' : '👧';
        const genderText = patient.gender === 'male' ? '남아' : '여아';
        const statusBadge = patient.status === 'ongoing' 
            ? '<span class="patient-badge badge-ongoing">치료중</span>'
            : '<span class="patient-badge badge-completed">치료완료</span>';
        
        const lastMeasurement = patient.measurements && patient.measurements.length > 0
            ? patient.measurements[patient.measurements.length - 1]
            : null;
        
        return `
            <div class="patient-card" onclick="showPatientDetail('${patient.id}')">
                <div class="patient-card-header">
                    <div>
                        <div class="patient-name">${genderIcon} ${patient.name}</div>
                        <div style="font-size: 12px; color: #999; margin-top: 4px;">
                            ${patient.chartNumber || '-'}
                        </div>
                    </div>
                </div>
                
                <div class="patient-info-row">
                    <span class="info-label">성별/나이</span>
                    <span class="info-value">${genderText} / 만 ${age}세</span>
                </div>
                
                <div class="patient-info-row">
                    <span class="info-label">생년월일</span>
                    <span class="info-value">${patient.birthDate}</span>
                </div>
                
                ${lastMeasurement ? `
                <div class="patient-info-row">
                    <span class="info-label">최근 키/몸무게</span>
                    <span class="info-value">${lastMeasurement.height}cm / ${lastMeasurement.weight}kg</span>
                </div>
                ` : ''}
                
                <div class="patient-info-row">
                    <span class="info-label">측정 횟수</span>
                    <span class="info-value">${patient.measurements ? patient.measurements.length : 0}회</span>
                </div>
                
                ${statusBadge}
            </div>
        `;
    }).join('');
}

// ===== 환자 추가 모달 =====

function showAddPatientModal() {
    currentPatient = null;
    document.getElementById('patientModalTitle').textContent = '환자 등록';
    document.getElementById('patientForm').reset();
    document.getElementById('patientId').value = '';
    document.getElementById('patientModal').style.display = 'flex';
}

function closePatientModal() {
    document.getElementById('patientModal').style.display = 'none';
}

function savePatient(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('patientName').value,
        gender: document.getElementById('patientGender').value,
        birthDate: document.getElementById('patientBirthDate').value,
        chartNumber: document.getElementById('chartNumber').value || `P${Date.now()}`,
        parentPhone: document.getElementById('parentPhone').value,
        fatherHeight: parseFloat(document.getElementById('fatherHeight').value) || null,
        motherHeight: parseFloat(document.getElementById('motherHeight').value) || null,
        targetHeight: parseFloat(document.getElementById('targetHeight').value) || null,
        specialNotes: document.getElementById('specialNotes').value,
        status: 'ongoing',
        measurements: [],
        updatedAt: new Date().toISOString()
    };
    
    const patientId = document.getElementById('patientId').value;
    
    if (patientId) {
        // 수정
        const index = patients.findIndex(p => p.id === patientId);
        if (index !== -1) {
            patients[index] = { ...patients[index], ...formData };
            console.log('✅ 환자 정보 수정됨:', formData.name);
        }
    } else {
        // 추가
        const newPatient = {
            id: generateId(),
            ...formData,
            createdAt: new Date().toISOString()
        };
        patients.push(newPatient);
        console.log('✅ 새 환자 등록됨:', formData.name);
    }
    
    savePatients();
    renderPatientsList();
    updateStats();
    closePatientModal();
}

// ===== 환자 상세 보기 =====

function showPatientDetail(patientId) {
    currentPatient = patients.find(p => p.id === patientId);
    if (!currentPatient) return;
    
    document.getElementById('patientDetailTitle').textContent = `${currentPatient.name} 환자 정보`;
    
    // 기본정보 탭으로 전환
    switchDetailTab('info');
    
    // 기본정보 렌더링
    renderPatientInfo();
    
    // 모달 열기
    document.getElementById('patientDetailModal').style.display = 'flex';
}

function closePatientDetailModal() {
    document.getElementById('patientDetailModal').style.display = 'none';
    currentPatient = null;
}

function switchDetailTab(tabName) {
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 탭 콘텐츠 표시
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // 해당 탭 데이터 렌더링
    if (tabName === 'records') {
        renderRecordsList();
    } else if (tabName === 'chart') {
        renderGrowthChart();
    }
}

function renderPatientInfo() {
    if (!currentPatient) return;
    
    const age = calculateAge(currentPatient.birthDate);
    const genderIcon = currentPatient.gender === 'male' ? '👦' : '👧';
    const genderText = currentPatient.gender === 'male' ? '남아' : '여아';
    
    const html = `
        <div class="detail-info-grid">
            <div class="detail-info-item">
                <div class="detail-info-label">이름</div>
                <div class="detail-info-value">${genderIcon} ${currentPatient.name}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">성별</div>
                <div class="detail-info-value">${genderText}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">생년월일</div>
                <div class="detail-info-value">${currentPatient.birthDate}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">만 나이</div>
                <div class="detail-info-value">${age}세</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">차트번호</div>
                <div class="detail-info-value">${currentPatient.chartNumber || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">연락처</div>
                <div class="detail-info-value">${currentPatient.parentPhone || '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">아버지 키</div>
                <div class="detail-info-value">${currentPatient.fatherHeight ? currentPatient.fatherHeight + 'cm' : '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">어머니 키</div>
                <div class="detail-info-value">${currentPatient.motherHeight ? currentPatient.motherHeight + 'cm' : '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">희망 키</div>
                <div class="detail-info-value">${currentPatient.targetHeight ? currentPatient.targetHeight + 'cm' : '-'}</div>
            </div>
            <div class="detail-info-item">
                <div class="detail-info-label">치료 상태</div>
                <div class="detail-info-value">${currentPatient.status === 'ongoing' ? '치료중' : '치료완료'}</div>
            </div>
        </div>
        
        ${currentPatient.specialNotes ? `
        <div style="margin-top: 20px; padding: 16px; background: #f7fafc; border-radius: 12px;">
            <div style="font-size: 14px; font-weight: 600; color: #4a5568; margin-bottom: 8px;">📝 특이사항</div>
            <div style="font-size: 14px; color: #2d3748; white-space: pre-wrap; line-height: 1.6;">${currentPatient.specialNotes}</div>
        </div>
        ` : ''}
    `;
    
    document.getElementById('patientDetailInfo').innerHTML = html;
}

// ===== 측정 기록 =====

function renderRecordsList() {
    if (!currentPatient) return;
    
    const container = document.getElementById('recordsList');
    const measurements = currentPatient.measurements || [];
    
    if (measurements.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📏</div>
                <div class="empty-state-text">측정 기록이 없습니다</div>
            </div>
        `;
        return;
    }
    
    // 날짜 순으로 정렬 (최신순)
    const sorted = [...measurements].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sorted.map((record, index) => {
        const recordNumber = measurements.length - index;
        const age = calculateAge(currentPatient.birthDate, new Date(record.date));
        
        // 이전 측정과의 차이 계산
        let heightGrowth = '';
        if (index < sorted.length - 1) {
            const prevRecord = sorted[index + 1];
            const growth = (record.height - prevRecord.height).toFixed(1);
            heightGrowth = growth > 0 ? `<span style="color: #00b894; font-size: 13px; margin-left: 4px;">(+${growth}cm)</span>` : '';
        }
        
        return `
            <div class="record-item">
                <div class="record-header">
                    <span class="record-number">${recordNumber}회차</span>
                    <span class="record-date">${record.date} (만 ${age}세)</span>
                </div>
                <div class="record-data">
                    <div class="record-data-item">
                        <div class="record-data-label">키</div>
                        <div class="record-data-value">${record.height}cm ${heightGrowth}</div>
                    </div>
                    <div class="record-data-item">
                        <div class="record-data-label">몸무게</div>
                        <div class="record-data-value">${record.weight}kg</div>
                    </div>
                    ${record.boneAge ? `
                    <div class="record-data-item">
                        <div class="record-data-label">뼈나이</div>
                        <div class="record-data-value">${record.boneAge}세</div>
                    </div>
                    ` : ''}
                    ${record.predictedHeight ? `
                    <div class="record-data-item">
                        <div class="record-data-label">예측키</div>
                        <div class="record-data-value">${record.predictedHeight}cm</div>
                    </div>
                    ` : ''}
                </div>
                ${record.memo ? `
                <div class="record-memo">${record.memo}</div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function showAddRecordModal() {
    if (!currentPatient) return;
    
    document.getElementById('recordForm').reset();
    document.getElementById('recordPatientId').value = currentPatient.id;
    document.getElementById('recordId').value = '';
    document.getElementById('recordDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('recordModal').style.display = 'flex';
}

function closeRecordModal() {
    document.getElementById('recordModal').style.display = 'none';
}

function saveRecord(event) {
    event.preventDefault();
    
    if (!currentPatient) return;
    
    const recordData = {
        id: generateId(),
        date: document.getElementById('recordDate').value,
        height: parseFloat(document.getElementById('recordHeight').value),
        weight: parseFloat(document.getElementById('recordWeight').value),
        boneAge: parseFloat(document.getElementById('boneAge').value) || null,
        predictedHeight: parseFloat(document.getElementById('predictedHeight').value) || null,
        memo: document.getElementById('recordMemo').value
    };
    
    // 환자의 측정 기록에 추가
    if (!currentPatient.measurements) {
        currentPatient.measurements = [];
    }
    currentPatient.measurements.push(recordData);
    
    // 환자 정보 업데이트
    const patientIndex = patients.findIndex(p => p.id === currentPatient.id);
    if (patientIndex !== -1) {
        patients[patientIndex] = currentPatient;
    }
    
    savePatients();
    renderRecordsList();
    closeRecordModal();
    
    console.log('✅ 측정 기록 추가됨:', recordData.date);
}

// ===== 성장 차트 =====

let growthChart = null;

function renderGrowthChart() {
    if (!currentPatient || !currentPatient.measurements || currentPatient.measurements.length === 0) {
        document.querySelector('.chart-wrapper').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-text">측정 기록이 없어 차트를 표시할 수 없습니다</div>
            </div>
        `;
        return;
    }
    
    const canvas = document.getElementById('patientGrowthChart');
    const ctx = canvas.getContext('2d');
    
    // 기존 차트 제거
    if (growthChart) {
        growthChart.destroy();
    }
    
    // 환자 데이터 준비
    const patientData = currentPatient.measurements.map(m => {
        const age = calculateAge(currentPatient.birthDate, new Date(m.date));
        return {
            x: age,
            y: m.height
        };
    });
    
    // 표준 성장 곡선 데이터 (5th, 50th, 95th)
    const standardData = getStandardGrowthData(currentPatient.gender);
    
    // 차트 생성
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                ...standardData,
                {
                    label: `${currentPatient.name}의 성장 기록`,
                    data: patientData,
                    borderColor: '#e53e3e',
                    backgroundColor: '#e53e3e',
                    pointBackgroundColor: '#e53e3e',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    borderWidth: 3,
                    tension: 0.4,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    enabled: true
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: '만 나이 (세)'
                    },
                    min: 2,
                    max: 18
                },
                y: {
                    title: {
                        display: true,
                        text: '키 (cm)'
                    },
                    min: 80,
                    max: 190
                }
            }
        }
    });
}

function getStandardGrowthData(gender) {
    // 간단한 백분위 데이터 (실제로는 더 정확한 데이터 사용)
    const ages = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    
    const maleData = {
        P5: [82, 88, 94, 100, 106, 112, 118, 124, 129, 133, 138, 145, 153, 161, 167, 171, 173],
        P50: [86, 93, 99, 106, 113, 120, 126, 132, 137, 142, 148, 156, 164, 170, 174, 176, 177],
        P95: [90, 97, 104, 111, 118, 126, 133, 140, 145, 151, 158, 167, 175, 179, 181, 182, 183]
    };
    
    const femaleData = {
        P5: [81, 87, 93, 99, 105, 111, 117, 123, 129, 135, 141, 147, 151, 154, 156, 157, 157],
        P50: [85, 92, 98, 105, 112, 119, 125, 131, 137, 143, 149, 154, 158, 160, 161, 162, 162],
        P95: [89, 96, 103, 110, 118, 126, 133, 139, 145, 151, 157, 161, 164, 166, 167, 167, 167]
    };
    
    const data = gender === 'male' ? maleData : femaleData;
    
    return [
        {
            label: '5th 백분위',
            data: ages.map((age, i) => ({ x: age, y: data.P5[i] })),
            borderColor: '#93c5fd',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            order: 100,
            fill: false
        },
        {
            label: '50th 백분위',
            data: ages.map((age, i) => ({ x: age, y: data.P50[i] })),
            borderColor: '#3b82f6',
            borderDash: [3, 3],
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.4,
            order: 100,
            fill: false
        },
        {
            label: '95th 백분위',
            data: ages.map((age, i) => ({ x: age, y: data.P95[i] })),
            borderColor: '#1e40af',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            order: 100,
            fill: false
        }
    ];
}

// ===== 환자 수정 =====

function editPatient() {
    if (!currentPatient) return;
    
    closePatientDetailModal();
    
    // 폼에 현재 환자 데이터 채우기
    document.getElementById('patientModalTitle').textContent = '환자 정보 수정';
    document.getElementById('patientId').value = currentPatient.id;
    document.getElementById('patientName').value = currentPatient.name;
    document.getElementById('patientGender').value = currentPatient.gender;
    document.getElementById('patientBirthDate').value = currentPatient.birthDate;
    document.getElementById('chartNumber').value = currentPatient.chartNumber || '';
    document.getElementById('parentPhone').value = currentPatient.parentPhone || '';
    document.getElementById('fatherHeight').value = currentPatient.fatherHeight || '';
    document.getElementById('motherHeight').value = currentPatient.motherHeight || '';
    document.getElementById('targetHeight').value = currentPatient.targetHeight || '';
    document.getElementById('specialNotes').value = currentPatient.specialNotes || '';
    
    document.getElementById('patientModal').style.display = 'flex';
}

// ===== 환자 삭제 =====

function deletePatient() {
    if (!currentPatient) return;
    
    if (!confirm(`${currentPatient.name} 환자의 모든 데이터를 삭제하시겠습니까?`)) {
        return;
    }
    
    patients = patients.filter(p => p.id !== currentPatient.id);
    savePatients();
    renderPatientsList();
    updateStats();
    closePatientDetailModal();
    
    console.log('🗑️ 환자 삭제됨:', currentPatient.name);
}

// ===== 유틸리티 함수 =====

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function calculateAge(birthDate, targetDate = new Date()) {
    const birth = new Date(birthDate);
    const target = new Date(targetDate);
    const ageInMs = target - birth;
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
    return ageInYears.toFixed(1);
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}
