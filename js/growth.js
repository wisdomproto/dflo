// 차트 변수
let growthChart = null;
let currentChartType = 'height';

// 페이지 로드
document.addEventListener('DOMContentLoaded', function() {
    // 오늘 날짜 설정
    document.getElementById('date').value = getTodayDate();
    
    // 저장된 기록 불러오기
    loadRecords();
    
    // 초기 차트 생성
    createChart();
});

// 폼 제출
function handleSubmit(event) {
    event.preventDefault();
    
    const record = {
        date: document.getElementById('date').value,
        gender: document.getElementById('gender').value,
        age: parseFloat(document.getElementById('age').value),
        height: parseFloat(document.getElementById('height').value),
        weight: parseFloat(document.getElementById('weight').value)
    };
    
    // 저장
    StorageManager.saveGrowthRecord(record);
    
    // 폼 리셋
    document.getElementById('growthForm').reset();
    document.getElementById('date').value = getTodayDate();
    
    // 기록 다시 불러오기
    loadRecords();
    
    // 차트 업데이트
    updateChart();
    
    // 성공 메시지
    alert('✅ 성장 기록이 저장되었습니다!');
}

// 기록 불러오기
function loadRecords() {
    const records = StorageManager.getGrowthRecords();
    const tbody = document.getElementById('recordsTable');
    
    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    기록이 없습니다. 위 폼에서 성장 기록을 추가해보세요.
                </td>
            </tr>
        `;
        return;
    }
    
    // 날짜 역순 정렬
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = records.map((record, index) => {
        const heightPercentile = calculatePercentile(record.gender, 'height', record.age, record.height);
        const genderText = record.gender === 'male' ? '남아' : '여아';
        
        return `
            <tr>
                <td>${record.date}</td>
                <td>${genderText}</td>
                <td>${record.age}세</td>
                <td>${record.height}</td>
                <td>${record.weight}</td>
                <td>
                    <span class="percentile-badge percentile-${heightPercentile.category}">
                        ${heightPercentile.level}
                    </span>
                </td>
                <td>
                    <button class="btn-delete" onclick="deleteRecord(${index})">삭제</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 기록 삭제
function deleteRecord(index) {
    if (confirm('이 기록을 삭제하시겠습니까?')) {
        const records = StorageManager.getGrowthRecords();
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 원본 배열에서 인덱스 찾기
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

// 차트 생성
function createChart() {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '성장 곡선',
                    font: { size: 18, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: '나이 (세)',
                        font: { size: 14, weight: 'bold' }
                    },
                    min: 2,
                    max: 18
                },
                y: {
                    title: {
                        display: true,
                        text: currentChartType === 'height' ? '키 (cm)' : '몸무게 (kg)',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        }
    });
    
    updateChart();
}

// 차트 업데이트
function updateChart() {
    if (!growthChart) return;
    
    const records = StorageManager.getGrowthRecords();
    
    // 성별로 그룹화
    const maleRecords = records.filter(r => r.gender === 'male').sort((a, b) => a.age - b.age);
    const femaleRecords = records.filter(r => r.gender === 'female').sort((a, b) => a.age - b.age);
    
    const datasets = [];
    
    // 표준 곡선 데이터 (남아)
    if (maleRecords.length > 0 || femaleRecords.length === 0) {
        const maleData = growthData.male[currentChartType];
        datasets.push(
            {
                label: '남아 P97',
                data: maleData.map(d => ({ x: d.age, y: d.p97 })),
                borderColor: 'rgba(59, 130, 246, 0.3)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0
            },
            {
                label: '남아 P50',
                data: maleData.map(d => ({ x: d.age, y: d.p50 })),
                borderColor: 'rgba(59, 130, 246, 0.6)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                pointRadius: 0
            },
            {
                label: '남아 P3',
                data: maleData.map(d => ({ x: d.age, y: d.p3 })),
                borderColor: 'rgba(59, 130, 246, 0.3)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0
            }
        );
    }
    
    // 표준 곡선 데이터 (여아)
    if (femaleRecords.length > 0 || maleRecords.length === 0) {
        const femaleData = growthData.female[currentChartType];
        datasets.push(
            {
                label: '여아 P97',
                data: femaleData.map(d => ({ x: d.age, y: d.p97 })),
                borderColor: 'rgba(236, 72, 153, 0.3)',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0
            },
            {
                label: '여아 P50',
                data: femaleData.map(d => ({ x: d.age, y: d.p50 })),
                borderColor: 'rgba(236, 72, 153, 0.6)',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                borderWidth: 2,
                pointRadius: 0
            },
            {
                label: '여아 P3',
                data: femaleData.map(d => ({ x: d.age, y: d.p3 })),
                borderColor: 'rgba(236, 72, 153, 0.3)',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0
            }
        );
    }
    
    // 사용자 데이터 (남아)
    if (maleRecords.length > 0) {
        datasets.push({
            label: '우리 아이 (남아)',
            data: maleRecords.map(r => ({
                x: r.age,
                y: currentChartType === 'height' ? r.height : r.weight
            })),
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f6',
            borderWidth: 3,
            pointRadius: 6,
            pointHoverRadius: 8
        });
    }
    
    // 사용자 데이터 (여아)
    if (femaleRecords.length > 0) {
        datasets.push({
            label: '우리 아이 (여아)',
            data: femaleRecords.map(r => ({
                x: r.age,
                y: currentChartType === 'height' ? r.height : r.weight
            })),
            borderColor: '#ec4899',
            backgroundColor: '#ec4899',
            borderWidth: 3,
            pointRadius: 6,
            pointHoverRadius: 8
        });
    }
    
    growthChart.data.datasets = datasets;
    growthChart.options.scales.y.title.text = currentChartType === 'height' ? '키 (cm)' : '몸무게 (kg)';
    growthChart.update();
}

// 차트 전환
function switchChart(type) {
    currentChartType = type;
    
    // 탭 활성화
    document.querySelectorAll('.btn-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-chart="${type}"]`).classList.add('active');
    
    updateChart();
}
