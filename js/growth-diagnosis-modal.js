/**
 * GrowthDiagnosisModal - 성장 진단 모달 클래스
 * 다른 페이지에서 재사용 가능한 팝업 형태의 성장 진단 기능
 */

class GrowthDiagnosisModal {
    constructor(options = {}) {
        this.options = {
            containerId: options.containerId || 'growthDiagnosisModal',
            onClose: options.onClose || null,
            selectedChildId: options.selectedChildId || null,
            ...options
        };
        
        this.modal = null;
        this.isOpen = false;
        this.selectedChildId = this.options.selectedChildId;
        this.selectedChild = null;
        this.growthRecords = [];
        this.currentView = 'chart'; // list, chart
        
        this.init();
    }
    
    /**
     * 초기화
     */
    init() {
        this.createModal();
        this.loadKoreaGrowthStandard();
    }
    
    /**
     * 한국 표준 성장도표 로드
     */
    async loadKoreaGrowthStandard() {
        if (typeof window.koreaGrowthStandard !== 'undefined') {
            if (!window.koreaGrowthStandard.isLoaded) {
                try {
                    await window.koreaGrowthStandard.loadData();
                    console.log('✅ [GrowthDiagnosisModal] 성장도표 데이터 로드 완료');
                } catch (error) {
                    console.error('❌ [GrowthDiagnosisModal] 성장도표 데이터 로드 실패:', error);
                }
            }
        } else {
            console.warn('[GrowthDiagnosisModal] koreaGrowthStandard 라이브러리가 없습니다');
        }
    }
    
    /**
     * 모달 HTML 생성
     */
    createModal() {
        const modalHTML = `
            <div id="${this.options.containerId}" class="growth-modal" style="display: none;">
                <div class="growth-modal-overlay" onclick="window.growthDiagnosisModal.close()"></div>
                <div class="growth-modal-content">
                    <!-- 헤더 -->
                    <div class="growth-modal-header">
                        <h2>📊 성장 진단</h2>
                        <button class="growth-modal-close" onclick="window.growthDiagnosisModal.close()">✕</button>
                    </div>
                    
                    <!-- 아이 선택 -->
                    <div class="growth-child-selector">
                        <select id="growthChildSelector" onchange="window.growthDiagnosisModal.onChildChange()">
                            <option value="">아이를 선택하세요</option>
                        </select>
                    </div>
                    
                    <!-- 탭 네비게이션 -->
                    <div class="growth-tabs">
                        <button class="growth-tab active" data-view="chart" onclick="window.growthDiagnosisModal.switchView('chart')">
                            📊 차트
                        </button>
                        <button class="growth-tab" data-view="list" onclick="window.growthDiagnosisModal.switchView('list')">
                            📋 기록
                        </button>
                    </div>
                    
                    <!-- 컨텐츠 영역 -->
                    <div class="growth-modal-body">
                        <!-- 차트 뷰 -->
                        <div id="growthChartView" class="growth-view active" style="display: block;">
                            <!-- 예측키 변화 막대 그래프 -->
                            <div id="predictedHeightCard" class="predicted-height-card">
                                <div class="predicted-height-header">
                                    <h3>📊 예측키 변화</h3>
                                </div>
                                <div class="bar-chart-container">
                                    <div class="bar-chart-wrapper">
                                        <!-- 첫 측정 막대 -->
                                        <div class="bar-item">
                                            <div class="bar-label">첫 측정</div>
                                            <div class="bar-outer">
                                                <div class="bar-inner" id="firstBar" data-height="0">
                                                    <span class="bar-value" id="firstBarValue">--</span>
                                                </div>
                                            </div>
                                            <div class="bar-date" id="firstPredictedDate">--</div>
                                        </div>
                                        
                                        <!-- 최근 측정 막대 -->
                                        <div class="bar-item">
                                            <div class="bar-label">최근 측정</div>
                                            <div class="bar-outer">
                                                <div class="bar-inner" id="recentBar" data-height="0">
                                                    <span class="bar-value" id="recentBarValue">--</span>
                                                </div>
                                            </div>
                                            <div class="bar-date" id="recentPredictedDate">--</div>
                                        </div>
                                    </div>
                                    
                                    <!-- 변화량 표시 -->
                                    <div class="predicted-change" id="predictedChange">
                                        <!-- 변화량 표시 -->
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 차트 -->
                            <div class="growth-chart-container">
                                <canvas id="growthChart"></canvas>
                            </div>
                        </div>
                        
                        <!-- 기록 뷰 -->
                        <div id="growthListView" class="growth-view" style="display: none;">
                            <div id="growthRecordsList" class="growth-records-list">
                                <!-- 기록 목록이 여기에 표시됩니다 -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // DOM에 추가
        const container = document.createElement('div');
        container.innerHTML = modalHTML;
        document.body.appendChild(container.firstElementChild);
        
        this.modal = document.getElementById(this.options.containerId);
        
        // 전역 참조 저장
        window.growthDiagnosisModal = this;
    }
    
    /**
     * 모달 열기
     */
    open(childId = null) {
        if (childId) {
            this.selectedChildId = childId;
        }
        
        this.loadChildren();
        this.modal.style.display = 'flex';
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        console.log('✅ [GrowthDiagnosisModal] 모달 열림');
    }
    
    /**
     * 모달 닫기
     */
    close() {
        this.modal.style.display = 'none';
        this.isOpen = false;
        document.body.style.overflow = '';
        
        if (this.options.onClose) {
            this.options.onClose();
        }
        
        console.log('✅ [GrowthDiagnosisModal] 모달 닫힘');
    }
    
    /**
     * 아이 목록 로드
     */
    loadChildren() {
        try {
            const childrenJson = localStorage.getItem('children');
            if (!childrenJson) {
                console.warn('[GrowthDiagnosisModal] 아이 데이터가 없습니다');
                return;
            }
            
            const children = JSON.parse(childrenJson);
            const selector = document.getElementById('growthChildSelector');
            
            selector.innerHTML = '<option value="">아이를 선택하세요</option>';
            children.forEach(child => {
                const option = document.createElement('option');
                option.value = child.id;
                option.textContent = `${child.name} (${child.gender === 'male' ? '남' : '여'})`;
                selector.appendChild(option);
            });
            
            // 선택된 아이 설정
            if (this.selectedChildId) {
                selector.value = this.selectedChildId;
                this.onChildChange();
            } else {
                const savedChildId = localStorage.getItem('selectedChildId');
                if (savedChildId) {
                    this.selectedChildId = savedChildId;
                    selector.value = savedChildId;
                    this.onChildChange();
                }
            }
        } catch (error) {
            console.error('[GrowthDiagnosisModal] 아이 목록 로드 오류:', error);
        }
    }
    
    /**
     * 아이 선택 변경
     */
    onChildChange() {
        const selector = document.getElementById('growthChildSelector');
        this.selectedChildId = selector.value;
        
        if (!this.selectedChildId) {
            return;
        }
        
        // 선택된 아이 정보 가져오기
        try {
            const childrenJson = localStorage.getItem('children');
            const children = JSON.parse(childrenJson);
            this.selectedChild = children.find(c => c.id === this.selectedChildId);
            
            // 성장 기록 로드
            this.loadGrowthRecords();
            
            console.log('[GrowthDiagnosisModal] 선택된 아이:', this.selectedChild.name);
        } catch (error) {
            console.error('[GrowthDiagnosisModal] 아이 선택 오류:', error);
        }
    }
    
    /**
     * 성장 기록 로드 (routine 데이터에서)
     */
    loadGrowthRecords() {
        try {
            this.growthRecords = [];
            
            if (!this.selectedChildId) {
                console.log('[GrowthDiagnosisModal] 선택된 아이가 없습니다');
                return;
            }
            
            console.log('[GrowthDiagnosisModal] 데이터 로드 시작:', this.selectedChildId);
            
            // localStorage의 모든 키를 순회하면서 routine_ 데이터 찾기
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                
                // routine_${childId}_${date} 형식의 키 찾기
                if (key && key.startsWith(`routine_${this.selectedChildId}_`)) {
                    try {
                        const dataJson = localStorage.getItem(key);
                        const data = JSON.parse(dataJson);
                        
                        // 키와 몸무게가 있는 데이터만 포함
                        if (data.height && data.weight) {
                            const record = {
                                id: key,
                                date: data.date,
                                age: data.actualAge || null,
                                height: parseFloat(data.height),
                                weight: parseFloat(data.weight),
                                boneAge: data.boneAge || null,
                                predictedHeight: data.predictedHeightBasic || data.predictedHeightBoneAge || null,
                                notes: data.measurementNotes || '',
                                createdAt: data.savedAt || data.date
                            };
                            
                            // 예측키가 없고 성장도표가 로드되어 있으면 실시간 계산
                            if (!record.predictedHeight && record.age && record.height) {
                                if (typeof window.koreaGrowthStandard !== 'undefined' && window.koreaGrowthStandard.isLoaded) {
                                    try {
                                        const predicted = this.calculatePredictedHeight(
                                            record.height, 
                                            record.age, 
                                            this.selectedChild?.gender || 'male'
                                        );
                                        if (predicted && predicted.predictedHeight) {
                                            record.predictedHeight = predicted.predictedHeight;
                                            console.log(`📊 [예측키 계산] ${data.date}: ${record.predictedHeight.toFixed(1)} cm`);
                                        }
                                    } catch (error) {
                                        console.error('[예측키 계산 오류]', error);
                                    }
                                } else {
                                    console.log(`⏭️ [예측키] ${data.date}: 성장도표 미로드, 나중에 계산`);
                                }
                            }
                            
                            this.growthRecords.push(record);
                        }
                    } catch (error) {
                        console.error('[GrowthDiagnosisModal] 데이터 파싱 오류:', key, error);
                    }
                }
            }
            
            // 날짜순 정렬 (오래된 것부터)
            this.growthRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            console.log('[GrowthDiagnosisModal] 로드된 기록:', this.growthRecords.length, '개');
            console.log('[GrowthDiagnosisModal] 데이터 샘플:', this.growthRecords.slice(0, 3));
            
            // 현재 뷰 새로고침
            if (this.currentView === 'list') {
                this.renderRecordsList();
            } else if (this.currentView === 'chart') {
                this.renderChart();
                
                // 성장도표가 아직 로드되지 않았으면 로드 후 예측키 재계산
                if (typeof window.koreaGrowthStandard === 'undefined' || !window.koreaGrowthStandard.isLoaded) {
                    console.log('⏳ [예측키] 성장도표 로드 대기 중, 차트는 먼저 표시');
                    this.waitForGrowthStandard();
                }
            }
        } catch (error) {
            console.error('[GrowthDiagnosisModal] 기록 로드 오류:', error);
            this.growthRecords = [];
        }
    }
    
    /**
     * 성장도표 로드 대기 및 예측키 재계산
     */
    waitForGrowthStandard(retryCount = 0) {
        if (retryCount >= 15) {
            console.warn('⚠️ [예측키] 성장도표 로드 타임아웃 (3초), 예측키 없이 진행');
            return;
        }
        
        if (typeof window.koreaGrowthStandard !== 'undefined' && window.koreaGrowthStandard.isLoaded) {
            console.log('✅ [예측키] 성장도표 로드 완료, 예측키 재계산 시작');
            this.recalculatePredictedHeights();
        } else {
            setTimeout(() => this.waitForGrowthStandard(retryCount + 1), 200);
        }
    }
    
    /**
     * 예측키 재계산 (성장도표 로드 후)
     */
    recalculatePredictedHeights() {
        let updated = 0;
        
        this.growthRecords.forEach(record => {
            if (!record.predictedHeight && record.age && record.height) {
                try {
                    const predicted = this.calculatePredictedHeight(
                        record.height,
                        record.age,
                        this.selectedChild?.gender || 'male'
                    );
                    if (predicted && predicted.predictedHeight) {
                        record.predictedHeight = predicted.predictedHeight;
                        updated++;
                    }
                } catch (error) {
                    console.error('[예측키 재계산 오류]', error);
                }
            }
        });
        
        console.log(`✅ [예측키] ${updated}개 기록 재계산 완료`);
        
        // 차트 다시 렌더링
        if (this.currentView === 'chart') {
            this.renderChart();
        }
    }
    
    /**
     * 뷰 전환
     */
    switchView(view) {
        this.currentView = view;
        
        // 탭 버튼 상태 업데이트
        document.querySelectorAll('.growth-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.view === view) {
                tab.classList.add('active');
            }
        });
        
        // 뷰 표시/숨김
        document.querySelectorAll('.growth-view').forEach(v => {
            v.style.display = 'none';
            v.classList.remove('active');
        });
        
        const viewElement = document.getElementById(`growth${view.charAt(0).toUpperCase() + view.slice(1)}View`);
        if (viewElement) {
            viewElement.style.display = 'block';
            viewElement.classList.add('active');
        }
        
        // 뷰별 렌더링
        if (view === 'list') {
            this.renderRecordsList();
        } else if (view === 'chart') {
            this.renderChart();
        }
    }
    
    /**
     * 기록 저장
     */
    saveRecord() {
        if (!this.selectedChildId) {
            alert('아이를 선택해주세요');
            return;
        }
        
        const date = document.getElementById('growthMeasureDate').value;
        const age = parseFloat(document.getElementById('growthAge').value);
        const height = parseFloat(document.getElementById('growthHeight').value);
        const weight = parseFloat(document.getElementById('growthWeight').value);
        const boneAge = parseFloat(document.getElementById('growthBoneAge').value);
        const predictedHeight = parseFloat(document.getElementById('growthPredictedHeight').value);
        const notes = document.getElementById('growthNotes').value;
        
        if (!date || !age || !height || !weight) {
            alert('필수 항목(날짜, 나이, 키, 몸무게)을 입력해주세요');
            return;
        }
        
        const record = {
            id: Date.now().toString(),
            date,
            age,
            height,
            weight,
            boneAge: boneAge || null,
            predictedHeight: predictedHeight || null,
            notes: notes || '',
            createdAt: new Date().toISOString()
        };
        
        this.growthRecords.push(record);
        this.growthRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        localStorage.setItem(`growth_records_${this.selectedChildId}`, JSON.stringify(this.growthRecords));
        
        alert('✅ 저장되었습니다!');
        
        // 폼 초기화
        document.getElementById('growthAge').value = '';
        document.getElementById('growthHeight').value = '';
        document.getElementById('growthWeight').value = '';
        document.getElementById('growthBoneAge').value = '';
        document.getElementById('growthPredictedHeight').value = '';
        document.getElementById('growthNotes').value = '';
        
        console.log('[GrowthDiagnosisModal] 기록 저장 완료');
    }
    
    /**
     * 기록 목록 렌더링
     */
    /**
     * 기록 리스트 렌더링 (growth.html 형식)
     */
    async renderRecordsList() {
        const container = document.getElementById('growthRecordsList');
        
        if (this.growthRecords.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div>기록이 없습니다</div>
                </div>
            `;
            return;
        }
        
        // 나이 오름차순 정렬 (어린 나이부터 표시)
        const sortedRecords = [...this.growthRecords].sort((a, b) => (a.age || 0) - (b.age || 0));
        
        // 한국 표준 성장도표 로드
        if (typeof window.koreaGrowthStandard !== 'undefined' && !window.koreaGrowthStandard.isLoaded) {
            try {
                await window.koreaGrowthStandard.loadData();
            } catch (error) {
                console.error('[GrowthDiagnosisModal] 성장도표 로드 실패:', error);
            }
        }
        
        // 성별 가져오기
        const gender = this.selectedChild?.gender || 'male';
        
        // 각 기록에 예측키 추가
        const recordsWithPrediction = await Promise.all(sortedRecords.map(async (record) => {
            let prediction = null;
            
            if (record.age && record.age < 18 && typeof window.koreaGrowthStandard !== 'undefined' && window.koreaGrowthStandard.isLoaded) {
                try {
                    prediction = window.koreaGrowthStandard.predictAdultHeight(
                        record.height,
                        record.age,
                        gender
                    );
                } catch (error) {
                    console.error('[GrowthDiagnosisModal] 예측 실패:', error);
                }
            }
            
            return { ...record, prediction };
        }));
        
        const genderText = gender === 'male' ? '남아 👦' : '여아 👧';
        
        container.innerHTML = recordsWithPrediction.map((record, index) => {
            // 메모 HTML
            const notesHTML = record.notes ? `
                <div class="record-notes" style="margin-top: 12px; padding: 8px 12px; background: #f9fafb; border-radius: 8px; border-left: 3px solid #14b8a6;">
                    <div style="font-size: 0.75rem; font-weight: 600; color: #6b7280; margin-bottom: 4px;">📝 메모</div>
                    <div style="font-size: 0.875rem; color: #374151; line-height: 1.5;">${record.notes}</div>
                </div>
            ` : '';
            
            // 예측키 칸 HTML
            let thirdStatHTML = '';
            if (record.prediction) {
                thirdStatHTML = `
                    <div class="record-stat">
                        <div class="record-stat-label" style="display: flex; align-items: center; gap: 4px;">
                            예상 최종 키 (18세)
                            <button onclick="alert('한국 표준 성장도표를 기반으로\\n현재 키와 나이의 백분위를 계산하고,\\n같은 백분위가 18세까지 유지된다고\\n가정하여 예측한 키입니다.')" style="background: rgba(120, 53, 15, 0.15); border: none; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.65rem; color: #78350f; padding: 0;">
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
                            <div class="record-stat-value" style="color: #14b8a6;">${record.height}cm</div>
                        </div>
                        <div class="record-stat">
                            <div class="record-stat-label">몸무게</div>
                            <div class="record-stat-value" style="color: #f59e0b;">${record.weight}kg</div>
                        </div>
                        ${thirdStatHTML}
                    </div>
                    ${notesHTML}
                </div>
            `;
        }).join('');
        
        console.log('✅ [GrowthDiagnosisModal] 기록 리스트 렌더링 완료:', recordsWithPrediction.length, '개');
    }
    
    /**
     * 기록 삭제
     */
    deleteRecord(recordId) {
        if (!confirm('이 기록을 삭제하시겠습니까?')) {
            return;
        }
        
        this.growthRecords = this.growthRecords.filter(r => r.id !== recordId);
        localStorage.setItem(`growth_records_${this.selectedChildId}`, JSON.stringify(this.growthRecords));
        
        this.renderRecordsList();
        
        console.log('[GrowthDiagnosisModal] 기록 삭제 완료');
    }
    
    /**
     * 차트 렌더링 (한국 표준 성장곡선 포함)
     */
    renderChart() {
        const canvas = document.getElementById('growthChart');
        
        if (!canvas) {
            console.error('[GrowthDiagnosisModal] 차트 캔버스를 찾을 수 없습니다');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        if (this.growthRecords.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#999';
            ctx.textAlign = 'center';
            ctx.fillText('기록이 없어 차트를 표시할 수 없습니다', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        // Chart.js로 차트 그리기
        if (window.Chart) {
            if (this.chart) {
                this.chart.destroy();
            }
            
            // 정렬된 기록
            const sortedRecords = [...this.growthRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // 성별 가져오기
            const gender = this.selectedChild?.gender || 'male';
            const chartType = 'height'; // 기본은 키 차트
            
            console.log('📊 [차트] 성별:', gender, '/ 기록 수:', sortedRecords.length);
            
            // 한국 표준 성장곡선 데이터
            const datasets = [];
            
            // growthData가 있으면 백분위선 추가
            if (typeof growthData !== 'undefined') {
                const genderData = growthData[gender][chartType];
                const color = gender === 'male' ? '59, 130, 246' : '236, 72, 153';
                const label = gender === 'male' ? '남아' : '여아';
                
                // 백분위선 (P5, P10, P25, P50, P75, P90, P95)
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
                
                console.log('✅ [차트] 백분위선 추가 완료');
            }
            
            // 사용자 데이터 (우리 아이)
            if (sortedRecords.length > 0) {
                const userColor = '#ff6b35'; // 밝은 주황색
                
                // 데이터 확인 로그
                console.log('📍 [차트] 사용자 데이터 포인트:', sortedRecords.map(r => ({
                    date: r.date,
                    age: r.age,
                    height: r.height,
                    x: r.age || 0,
                    y: r.height || 0
                })));
                
                const userData = sortedRecords
                    .filter(r => r.age && r.height) // age와 height가 있는 것만
                    .map(r => ({
                        x: parseFloat(r.age),
                        y: parseFloat(r.height)
                    }));
                
                console.log('📍 [차트] 필터링된 데이터:', userData);
                
                if (userData.length > 0) {
                    datasets.push({
                        label: `${this.selectedChild?.name || '우리 아이'}`,
                        data: userData,
                        borderColor: userColor,
                        backgroundColor: userColor,
                        borderWidth: 4,
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        pointBackgroundColor: userColor,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 3,
                        pointHoverBackgroundColor: userColor,
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 3,
                        fill: false,
                        tension: 0.4
                    });
                    
                    console.log('✅ [차트] 사용자 데이터 추가 완료:', userData.length, '개');
                } else {
                    console.warn('⚠️ [차트] age 또는 height가 없는 데이터:', sortedRecords);
                }
            }
            
            this.chart = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                boxWidth: 10,
                                padding: 8,
                                font: { size: 10 },
                                filter: function(item) {
                                    // 우리 아이 데이터만 범례에 표시
                                    return !item.text.includes('P');
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 13
                            },
                            callbacks: {
                                title: function(context) {
                                    const dataIndex = context[0].dataIndex;
                                    if (context[0].dataset.label.includes('P')) {
                                        return '';
                                    }
                                    const record = sortedRecords[dataIndex];
                                    return record.date;
                                },
                                label: function(context) {
                                    if (context.dataset.label.includes('P')) {
                                        return '';
                                    }
                                    const record = sortedRecords[context.dataIndex];
                                    return [
                                        `키: ${record.height}cm`,
                                        `몸무게: ${record.weight}kg`,
                                        `나이: ${record.age}세`
                                    ];
                                }
                            }
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
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: '키 (cm)',
                                font: { size: 11 }
                            },
                            ticks: { 
                                font: { size: 10 }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            }
                        }
                    }
                }
            });
            
            console.log('✅ [GrowthDiagnosisModal] 차트 렌더링 완료:', sortedRecords.length, '개 데이터');
            
            // 예측키 변화 표시
            this.updatePredictedHeightChange();
        } else {
            console.error('[GrowthDiagnosisModal] Chart.js가 로드되지 않았습니다');
        }
    }
    
    /**
     * 예측키 변화 업데이트
     */
    updatePredictedHeightChange() {
        console.log('🔍 [예측키 변화] 업데이트 시작');
        console.log('🔍 [예측키 변화] 전체 기록 수:', this.growthRecords.length);
        
        const sortedRecords = [...this.growthRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (sortedRecords.length === 0) {
            // 데이터 없음
            console.log('⚠️ [예측키 변화] 데이터 없음');
            document.getElementById('firstBarValue').textContent = '--';
            document.getElementById('firstPredictedDate').textContent = '--';
            document.getElementById('recentBarValue').textContent = '--';
            document.getElementById('recentPredictedDate').textContent = '--';
            document.getElementById('predictedChange').innerHTML = '';
            return;
        }
        
        // 예측키가 있는 기록만 필터링 (숫자로 변환 가능한 값만)
        const recordsWithPrediction = sortedRecords.filter(r => {
            const predicted = parseFloat(r.predictedHeight);
            const isValid = !isNaN(predicted) && predicted > 0;
            console.log(`🔍 [예측키 체크] ${r.date}: ${r.predictedHeight} → ${predicted} (유효: ${isValid})`);
            return isValid;
        });
        
        console.log('🔍 [예측키 변화] 예측키 있는 기록:', recordsWithPrediction.length, '개');
        
        if (recordsWithPrediction.length === 0) {
            // 예측키 데이터 없음
            console.log('⚠️ [예측키 변화] 예측키 데이터 없음');
            document.getElementById('firstBarValue').textContent = '--';
            document.getElementById('firstPredictedDate').textContent = '--';
            document.getElementById('recentBarValue').textContent = '--';
            document.getElementById('recentPredictedDate').textContent = '--';
            document.getElementById('predictedChange').innerHTML = '<div class="no-prediction">예측키 데이터가 없습니다</div>';
            return;
        }
        
        const firstRecord = recordsWithPrediction[0];
        const recentRecord = recordsWithPrediction[recordsWithPrediction.length - 1];
        
        // 숫자로 변환
        const firstPredicted = parseFloat(firstRecord.predictedHeight);
        const recentPredicted = parseFloat(recentRecord.predictedHeight);
        
        console.log('📊 [예측키 변화] 첫 측정:', firstPredicted.toFixed(1), 'cm @', firstRecord.date);
        console.log('📊 [예측키 변화] 최근 측정:', recentPredicted.toFixed(1), 'cm @', recentRecord.date);
        
        // 막대 높이 계산 (최소 140cm, 최대 200cm 범위로 정규화)
        const minHeight = 140;
        const maxHeight = 200;
        const heightRange = maxHeight - minHeight;
        
        const firstBarHeight = Math.min(100, Math.max(0, ((firstPredicted - minHeight) / heightRange) * 100));
        const recentBarHeight = Math.min(100, Math.max(0, ((recentPredicted - minHeight) / heightRange) * 100));
        
        console.log('📊 [막대 높이] 첫 측정:', firstBarHeight.toFixed(1), '% / 최근 측정:', recentBarHeight.toFixed(1), '%');
        
        // 날짜 표시
        document.getElementById('firstPredictedDate').textContent = this.formatDate(firstRecord.date);
        document.getElementById('recentPredictedDate').textContent = this.formatDate(recentRecord.date);
        
        // 변화량 계산
        const change = recentPredicted - firstPredicted;
        const changeAbs = Math.abs(change);
        
        console.log('📊 [예측키 변화] 변화량:', change > 0 ? `↑ ${changeAbs.toFixed(1)} cm` : change < 0 ? `↓ ${changeAbs.toFixed(1)} cm` : '변화 없음');
        
        let changeHTML = '';
        if (change > 0) {
            changeHTML = `
                <div class="change-positive">
                    <span class="change-icon">↑</span>
                    <span class="change-value">${changeAbs.toFixed(1)} cm 증가</span>
                </div>
            `;
        } else if (change < 0) {
            changeHTML = `
                <div class="change-negative">
                    <span class="change-icon">↓</span>
                    <span class="change-value">${changeAbs.toFixed(1)} cm 감소</span>
                </div>
            `;
        } else {
            changeHTML = `
                <div class="change-neutral">
                    <span class="change-value">변화 없음</span>
                </div>
            `;
        }
        
        document.getElementById('predictedChange').innerHTML = changeHTML;
        
        console.log('✅ [예측키 변화] UI 업데이트 완료');
        
        // 막대 애니메이션 트리거 (100ms 후)
        setTimeout(() => {
            const firstBar = document.getElementById('firstBar');
            const recentBar = document.getElementById('recentBar');
            const firstBarValueEl = document.getElementById('firstBarValue');
            const recentBarValueEl = document.getElementById('recentBarValue');
            
            if (firstBar && recentBar) {
                // 막대 높이 애니메이션 (아래에서 위로)
                firstBar.style.height = `${firstBarHeight}%`;
                recentBar.style.height = `${recentBarHeight}%`;
                
                // 값 표시
                firstBarValueEl.textContent = `${firstPredicted.toFixed(1)} cm`;
                recentBarValueEl.textContent = `${recentPredicted.toFixed(1)} cm`;
                
                // 카드 슬라이드 애니메이션
                const card = document.getElementById('predictedHeightCard');
                if (card) {
                    card.classList.add('animate');
                }
                
                console.log('🎬 [예측키 변화] 막대 애니메이션 시작');
            } else {
                console.error('❌ [예측키 변화] 막대 요소를 찾을 수 없습니다');
            }
        }, 100);
    }
    
    /**
     * 예측키 계산 (한국 표준 성장도표 사용)
     */
    calculatePredictedHeight(height, age, gender = 'male') {
        // koreaGrowthStandard가 로드되지 않았으면 null 반환
        if (typeof window.koreaGrowthStandard === 'undefined' || !window.koreaGrowthStandard.isLoaded) {
            console.warn('[예측키 계산] 한국 표준 성장도표가 로드되지 않았습니다');
            return null;
        }
        
        try {
            const result = window.koreaGrowthStandard.predictAdultHeight(height, age, gender);
            return result;
        } catch (error) {
            console.error('[예측키 계산 오류]', error);
            return null;
        }
    }
    
    /**
     * 날짜 포맷팅
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    }
}

// CSS 스타일 주입
const style = document.createElement('style');
style.textContent = `
/* 성장 진단 모달 */
.growth-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    align-items: center;
    justify-content: center;
}

.growth-modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
}

.growth-modal-content {
    position: relative;
    background: white;
    border-radius: 16px;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.growth-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
}

.growth-modal-header h2 {
    margin: 0;
    font-size: 20px;
    color: #1f2937;
}

.growth-modal-close {
    background: none;
    border: none;
    font-size: 24px;
    color: #9ca3af;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s;
}

.growth-modal-close:hover {
    background: #f3f4f6;
    color: #1f2937;
}

.growth-child-selector {
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
}

.growth-child-selector select {
    width: 100%;
    padding: 12px;
    border: 2px solid #14b8a6;
    border-radius: 8px;
    font-size: 15px;
    background: white;
}

.growth-tabs {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
}

.growth-tab {
    flex: 1;
    padding: 12px;
    border: none;
    background: none;
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.3s;
    border-bottom: 2px solid transparent;
}

.growth-tab:hover {
    color: #14b8a6;
}

.growth-tab.active {
    color: #14b8a6;
    border-bottom-color: #14b8a6;
}

.growth-modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
}

.growth-view {
    display: none;
}

.growth-view.active {
    display: block;
}

.growth-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
}

.form-group input,
.form-group textarea {
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 15px;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.growth-save-btn {
    padding: 14px;
    background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.growth-save-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3);
}

.growth-records-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
}

.record-item {
    padding: 16px;
    background: #f9fafb;
    border-radius: 12px;
    margin-bottom: 12px;
    border: 2px solid transparent;
    transition: all 0.3s ease;
}

.record-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.record-date {
    font-weight: 600;
    font-size: 0.875rem;
    color: #14b8a6;
}

.record-badge {
    font-size: 0.75rem;
    padding: 4px 12px;
    background: white;
    border-radius: 12px;
    color: #6b7280;
}

.record-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 12px;
}

.record-stat {
    text-align: center;
}

.record-stat-label {
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 4px;
    line-height: 1.2;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.record-stat-value {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1f2937;
    word-break: keep-all;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #9ca3af;
}

.empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.growth-chart-container {
    position: relative;
    height: 500px;
    padding: 20px;
}

.growth-chart-container canvas {
    max-height: 100%;
}

/* 예측키 변화 카드 */
.predicted-height-card {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-radius: 16px;
    padding: 20px;
    margin: 0 20px 20px 20px;
    border: 2px solid #0ea5e9;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.predicted-height-card.animate {
    opacity: 1;
    transform: translateY(0);
}

.predicted-height-header {
    margin-bottom: 20px;
}

.predicted-height-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #0c4a6e;
}

/* 막대 차트 컨테이너 */
.bar-chart-container {
    width: 100%;
}

.bar-chart-wrapper {
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    gap: 40px;
    height: 280px;
    padding: 20px;
    background: white;
    border-radius: 12px;
    margin-bottom: 16px;
}

.bar-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    max-width: 150px;
}

.bar-label {
    font-size: 14px;
    color: #64748b;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    order: 3;
}

.bar-outer {
    width: 100%;
    height: 200px;
    background: linear-gradient(to top, #f1f5f9 0%, #e2e8f0 100%);
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
    order: 2;
}

.bar-inner {
    width: 100%;
    height: 0%;
    background: linear-gradient(to top, #0ea5e9 0%, #38bdf8 100%);
    border-radius: 8px 8px 0 0;
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 8px;
    transition: height 1s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 -4px 12px rgba(14, 165, 233, 0.3);
}

.bar-value {
    font-size: 14px;
    font-weight: 700;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.bar-date {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
    order: 1;
}

.predicted-change {
    text-align: center;
    padding: 12px;
    border-radius: 8px;
    font-weight: 600;
}

.change-positive {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    color: #166534;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
}

.change-negative {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    color: #991b1b;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
}

.change-neutral {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    color: #4b5563;
    padding: 12px;
    border-radius: 8px;
}

.change-icon {
    font-size: 24px;
    font-weight: bold;
}

.change-value {
    font-size: 16px;
    font-weight: 700;
}

.no-prediction {
    color: #94a3b8;
    font-size: 14px;
    padding: 8px;
}

.empty-message {
    text-align: center;
    padding: 40px;
    color: #9ca3af;
    font-size: 15px;
}

@media (max-width: 600px) {
    .growth-modal-content {
        width: 100%;
        max-width: 100%;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
    }
    
    .form-row {
        grid-template-columns: 1fr;
    }
    
    .record-details {
        grid-template-columns: 1fr;
    }
}
`;
document.head.appendChild(style);
