// ===== 데일리 루틴 페이지 JavaScript =====

// 전역 변수
let currentDate = new Date();
let currentView = 'input';
let currentMealType = '';
let currentExerciseCategory = 'posture';
let currentMeasurementTab = 'basic'; // 측정 탭
let selectedRating = 0;
let selectedPortion = 'normal';
let selectedSleepQuality = 'normal';
let selectedMood = 'good';
let waterAmount = 0;
let selectedExercises = {}; // { exerciseId: true/false }
let currentMealPhoto = null; // 현재 선택된 식사 사진
let currentCalendarMonth = new Date(); // 현재 달력에 표시중인 월
let selectedChildId = null; // 선택된 아이 ID
let currentUser = null; // 현재 로그인한 사용자 정보
let isPatient = false; // 병원 환자 여부
let meals = {
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null
};

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo(); // 사용자 정보 로드
    loadChildren(); // 아이 목록 로드
    updateDateDisplay();
    loadRoutineData();
    initializeEventListeners();
    
    // 달력 범례 초기화
    updateCalendarLegend('all');
    
    // koreaGrowthStandard 데이터 로드
    if (typeof window.koreaGrowthStandard !== 'undefined') {
        window.koreaGrowthStandard.loadData().then(() => {
            console.log('✅ [routine.js] 성장도표 데이터 로드 완료');
        }).catch(error => {
            console.error('❌ [routine.js] 성장도표 데이터 로드 실패:', error);
        });
    }
    
    // challengeData 로드 확인 후 렌더링
    if (typeof challengeData !== 'undefined') {
        renderExerciseList();
    } else {
        // challengeData가 아직 로드되지 않은 경우, 잠시 후 재시도
        setTimeout(function() {
            if (typeof challengeData !== 'undefined') {
                renderExerciseList();
            } else {
                console.error('운동 데이터를 불러올 수 없습니다.');
                const container = document.getElementById('exerciseScrollContainer');
                if (container) {
                    container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 20px;">운동 데이터를 불러올 수 없습니다.<br><small>페이지를 새로고침해주세요.</small></p>';
                }
            }
        }, 100);
    }
});

// 사용자 정보 로드
async function loadUserInfo() {
    try {
        const SESSION_KEY = 'growth_care_user';
        const userJson = sessionStorage.getItem(SESSION_KEY);
        
        if (userJson) {
            currentUser = JSON.parse(userJson);
            console.log('✅ [routine.js] 사용자 정보 로드:', currentUser);
            
            // Supabase에서 최신 사용자 정보 가져오기 (is_patient 값 확인)
            if (currentUser.id && typeof supabase !== 'undefined') {
                const { data, error } = await supabase
                    .from('users')
                    .select('is_patient')
                    .eq('id', currentUser.id)
                    .single();
                
                if (!error && data) {
                    isPatient = data.is_patient || false;
                    console.log('✅ [routine.js] 병원 환자 여부:', isPatient);
                    
                    // UI 업데이트
                    updateUIByPatientType();
                } else {
                    console.warn('⚠️ [routine.js] 사용자 정보 조회 실패:', error);
                    isPatient = false;
                }
            }
        }
    } catch (error) {
        console.error('❌ [routine.js] 사용자 정보 로드 실패:', error);
        isPatient = false;
    }
}

// 환자 타입에 따라 UI 업데이트
function updateUIByPatientType() {
    console.log('🔄 [routine.js] UI 업데이트 시작 (병원환자:', isPatient, ')');
    
    // 자세히 측정 탭
    const detailedTab = document.querySelector('[data-tab="detailed"]');
    if (detailedTab) {
        if (isPatient) {
            detailedTab.style.display = 'block';
            console.log('  ✅ 자세히 측정 탭 표시');
        } else {
            detailedTab.style.display = 'none';
            console.log('  ❌ 자세히 측정 탭 숨김');
            // 현재 탭이 자세히 측정이면 기본 측정으로 전환
            if (currentMeasurementTab === 'detailed') {
                switchMeasurementTab('basic');
            }
        }
    } else {
        console.warn('  ⚠️ 자세히 측정 탭을 찾을 수 없음');
    }
    
    // 성장 주사 섹션
    const growthInjectionSection = document.querySelector('.growth-injection-section');
    if (growthInjectionSection) {
        if (isPatient) {
            growthInjectionSection.style.display = 'block';
            console.log('  ✅ 성장 주사 섹션 표시');
        } else {
            growthInjectionSection.style.display = 'none';
            console.log('  ❌ 성장 주사 섹션 숨김');
        }
    } else {
        console.warn('  ⚠️ 성장 주사 섹션을 찾을 수 없음');
    }
    
    console.log('✅ [routine.js] UI 업데이트 완료');
}

// 아이 목록 로드
function loadChildren() {
    try {
        const childrenJson = localStorage.getItem('children');
        if (childrenJson) {
            const children = JSON.parse(childrenJson);
            const selector = document.getElementById('childSelector');
            
            // 드롭다운 채우기
            selector.innerHTML = '<option value="">아이를 선택하세요</option>';
            children.forEach(child => {
                const option = document.createElement('option');
                option.value = child.id;
                option.textContent = `${child.name} (${child.gender === 'male' ? '남' : '여'})`;
                selector.appendChild(option);
            });
            
            // 저장된 선택 아이 복원
            const savedChildId = localStorage.getItem('selectedChildId');
            if (savedChildId) {
                selectedChildId = savedChildId;
                selector.value = savedChildId;
                updateChildName();
            } else if (children.length > 0) {
                // 첫 번째 아이 자동 선택
                selectedChildId = children[0].id;
                selector.value = selectedChildId;
                localStorage.setItem('selectedChildId', selectedChildId);
                updateChildName();
            }
        }
    } catch (error) {
        console.error('아이 목록 로드 오류:', error);
    }
}

// 아이 선택 변경
function onChildChange() {
    const selector = document.getElementById('childSelector');
    selectedChildId = selector.value;
    
    if (selectedChildId) {
        localStorage.setItem('selectedChildId', selectedChildId);
        updateChildName();
        loadRoutineData(); // 선택한 아이의 데이터 로드
    }
}

// 아이 이름 표시 업데이트
function updateChildName() {
    try {
        const childrenJson = localStorage.getItem('children');
        if (childrenJson && selectedChildId) {
            const children = JSON.parse(childrenJson);
            const child = children.find(c => c.id === selectedChildId);
            if (child) {
                const nameElement = document.getElementById('selectedChildName');
                if (nameElement) {
                    nameElement.textContent = `${child.name}의 성장 습관`;
                }
                
                // DOM이 완전히 로드될 때까지 약간 대기
                setTimeout(() => {
                    // 만나이 자동 계산
                    calculateAge(child);
                }, 100);
            }
        }
    } catch (error) {
        console.error('아이 이름 업데이트 오류:', error);
    }
}

// 만나이 자동 계산
function calculateAge(child) {
    try {
        console.log('=== calculateAge 호출됨 ===');
        console.log('child 데이터:', child);
        
        const birthDate = child.birthDate || child.birth_date;
        if (!birthDate) {
            console.warn('생년월일 정보가 없습니다');
            return;
        }
        
        console.log('생년월일:', birthDate);
        
        const birth = new Date(birthDate);
        const today = new Date();
        
        console.log('생일:', birth.toISOString().split('T')[0]);
        console.log('오늘:', today.toISOString().split('T')[0]);
        
        // 연도, 월, 일 차이 계산
        let years = today.getFullYear() - birth.getFullYear();
        let months = today.getMonth() - birth.getMonth();
        let days = today.getDate() - birth.getDate();
        
        console.log('초기 계산:', { years, months, days });
        
        // 일이 음수면 이전 달에서 빌려옴
        if (days < 0) {
            months--;
            // 이전 달의 마지막 날을 구함
            const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            days += lastMonth.getDate();
        }
        
        // 월이 음수면 이전 년도에서 빌려옴
        if (months < 0) {
            years--;
            months += 12;
        }
        
        console.log('조정 후:', { years, months, days });
        
        // 소수점 계산: 년 + (월/12) + (일/365)
        const decimalAge = years + (months / 12) + (days / 365);
        
        console.log('최종 만나이:', decimalAge.toFixed(2));
        
        const actualAgeField = document.getElementById('actualAge');
        
        console.log('actualAgeField 확인:', actualAgeField ? 'OK' : 'NULL');
        console.log('actualAgeField.value 설정 전:', actualAgeField ? actualAgeField.value : 'N/A');
        
        if (actualAgeField) {
            actualAgeField.value = decimalAge.toFixed(1) + ' 세';
            console.log('actualAgeField.value 설정 후:', actualAgeField.value);
            console.log('만나이 계산 완료:', decimalAge.toFixed(1));
            
            // 화면 강제 업데이트
            actualAgeField.dispatchEvent(new Event('change'));
        } else {
            console.error('actualAge 필드를 찾을 수 없습니다!');
        }
        
        // 키 입력이 있으면 예측키 자동 계산
        const heightField = document.getElementById('height');
        if (heightField && heightField.value) {
            calculateBasicPrediction();
        }
    } catch (error) {
        console.error('만나이 계산 오류:', error);
    }
}

// 예측키 설명 표시
function showPredictionHelp() {
    const message = `📊 통계 기반 예측키 설명

• 한국 표준 성장도표를 기반으로 예측합니다
• 현재 키와 나이의 백분위를 계산합니다
• 같은 백분위가 18세까지 유지된다고 가정합니다
• 18세에서의 같은 백분위 키를 예측키로 산출합니다

⚠️ 주의사항:
- 사춘기 시작 시기에 따라 달라질 수 있습니다
- 영양, 운동, 수면 등의 생활습관이 영향을 줍니다
- 참고용으로만 사용하세요`;
    
    alert(message);
}

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // 주사 체크박스
    const injectionCheck = document.getElementById('injectionCheck');
    if (injectionCheck) {
        injectionCheck.addEventListener('change', toggleInjectionTime);
    }
    
    // 기본 측정의 키 변경 시 자세히 측정의 키도 업데이트
    const heightBasic = document.getElementById('height');
    if (heightBasic) {
        heightBasic.addEventListener('input', function() {
            const heightDetailed = document.getElementById('heightDetailed');
            if (heightDetailed) {
                heightDetailed.value = this.value || '--';
            }
        });
    }
}

// 운동 탭 전환
function switchExerciseTab(category) {
    currentExerciseCategory = category;
    
    // 탭 버튼 상태 업데이트
    document.querySelectorAll('.exercise-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        }
    });
    
    renderExerciseList();
}

// 운동 리스트 렌더링
function renderExerciseList() {
    const container = document.getElementById('exerciseScrollContainer');
    
    if (!container) {
        console.error('exerciseScrollContainer를 찾을 수 없습니다.');
        return;
    }
    
    if (typeof challengeData === 'undefined' || !challengeData || !challengeData.exercise) {
        container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 20px;">운동 데이터를 불러올 수 없습니다.<br><small>페이지를 새로고침해주세요.</small></p>';
        return;
    }
    
    const exercises = challengeData.exercise[currentExerciseCategory];
    
    if (!exercises || exercises.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 20px;">운동 데이터가 없습니다.</p>';
        return;
    }
    
    container.innerHTML = exercises.map(exercise => `
        <div class="exercise-item-card ${selectedExercises[exercise.id] ? 'checked' : ''}" 
             onclick="toggleExercise('${exercise.id}')">
            <input 
                type="checkbox" 
                class="exercise-checkbox" 
                ${selectedExercises[exercise.id] ? 'checked' : ''}
                onclick="event.stopPropagation(); toggleExercise('${exercise.id}')">
            <div class="exercise-item-icon">${exercise.icon}</div>
            <div class="exercise-item-info">
                <div class="exercise-item-title">${exercise.title}</div>
                <div class="exercise-item-description">${exercise.description}</div>
            </div>
            ${exercise.videoUrl ? `
                <div class="exercise-item-actions">
                    <button class="video-btn" onclick="event.stopPropagation(); openYoutubeModal('${exercise.id}', '${exercise.title}', '${exercise.description}', '${exercise.videoUrl}')">
                        📺 영상
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    updateExerciseSummary();
}

// 운동 토글
function toggleExercise(exerciseId) {
    selectedExercises[exerciseId] = !selectedExercises[exerciseId];
    renderExerciseList();
}

// 운동 요약 업데이트
function updateExerciseSummary() {
    const summaryContent = document.getElementById('summaryContent');
    
    if (!summaryContent) {
        return;
    }
    
    const selectedIds = Object.keys(selectedExercises).filter(id => selectedExercises[id]);
    
    if (selectedIds.length === 0) {
        summaryContent.textContent = '선택된 운동이 없습니다';
        summaryContent.classList.add('empty');
        return;
    }
    
    summaryContent.classList.remove('empty');
    
    // challengeData가 없으면 ID만 표시
    if (typeof challengeData === 'undefined' || !challengeData || !challengeData.exercise) {
        summaryContent.innerHTML = `✅ 운동 ${selectedIds.length}개 선택됨`;
        return;
    }
    
    const exerciseNames = selectedIds.map(id => {
        const postureExercise = challengeData.exercise.posture.find(ex => ex.id === id);
        const growthExercise = challengeData.exercise.growth.find(ex => ex.id === id);
        const exercise = postureExercise || growthExercise;
        return exercise ? exercise.title : id;
    });
    
    summaryContent.innerHTML = `✅ ${exerciseNames.join(', ')} (총 ${selectedIds.length}개)`;
}

// 유튜브 모달 열기
function openYoutubeModal(exerciseId, title, description, videoUrl) {
    const modal = document.getElementById('youtubeModal');
    const titleElement = document.getElementById('videoTitle');
    const descElement = document.getElementById('videoDescription');
    const iframe = document.getElementById('youtubePlayer');
    
    // 유튜브 URL을 embed URL로 변환
    let embedUrl = videoUrl;
    if (videoUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(videoUrl).search);
        const videoId = urlParams.get('v');
        const timestamp = urlParams.get('t') || new URL(videoUrl).hash.replace('#t=', '').replace('s', '');
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
        if (timestamp) {
            embedUrl += `?start=${timestamp}`;
        }
        embedUrl += (timestamp ? '&' : '?') + 'autoplay=1';
    }
    
    titleElement.textContent = title;
    descElement.textContent = description;
    iframe.src = embedUrl;
    
    modal.style.display = 'flex';
}

// 유튜브 모달 닫기
function closeYoutubeModal() {
    const modal = document.getElementById('youtubeModal');
    const iframe = document.getElementById('youtubePlayer');
    
    // 비디오 정지를 위해 src 초기화
    iframe.src = '';
    modal.style.display = 'none';
}

// 날짜 표시 업데이트
function updateDateDisplay() {
    const dateElement = document.getElementById('currentDate');
    const nextBtn = document.getElementById('nextDateBtn');
    const today = new Date();
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()];
    
    dateElement.textContent = `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
    
    // 내일 이후는 이동 불가
    if (nextBtn) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        if (currentDate >= today) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.3';
            nextBtn.style.cursor = 'not-allowed';
        } else {
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
        }
    }
}

// 날짜 변경
function changeDate(days) {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    newDate.setHours(0, 0, 0, 0);
    
    // 내일 이후는 이동 불가
    if (newDate > today) {
        return;
    }
    
    currentDate = newDate;
    updateDateDisplay();
    loadRoutineData();
}

// 날짜 선택기 열기 (모달 방식)
function openDatePicker() {
    console.log('🗓️ [날짜 선택] openDatePicker 호출됨');
    
    // 새로운 모달 방식 사용
    if (typeof window.openDatePickerModal === 'function') {
        console.log('🗓️ [날짜 선택] 모달 방식 사용');
        window.openDatePickerModal();
    } else {
        console.warn('⚠️ [날짜 선택] 모달 함수 없음, 기본 picker 사용');
        // 폴백: 기존 방식
        const picker = document.getElementById('hiddenDatePicker');
        if (picker) {
            const dateStr = currentDate.toISOString().split('T')[0];
            picker.value = dateStr;
            picker.click();
        } else {
            console.error('❌ [날짜 선택] hiddenDatePicker 요소 없음');
        }
    }
}

// 날짜 선택
function selectDate(dateStr) {
    currentDate = new Date(dateStr + 'T00:00:00');
    updateDateDisplay();
    loadRoutineData();
}

// 오늘로 이동
function goToToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    currentDate = today;
    updateDateDisplay();
    loadRoutineData();
    console.log('오늘로 이동:', formatDate(currentDate));
}

// 뷰 전환 (전역 함수로 노출)
window.switchView = function switchView(view) {
    currentView = view;
    
    // 버튼 상태 업데이트
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        }
    });
    
    // 뷰 표시
    document.querySelectorAll('.view-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const viewMap = {
        'input': 'inputView',
        'calendar': 'statsView', // 달력 뷰 제거, 통계로 리다이렉트
        'stats': 'statsView'
    };
    
    const targetView = document.getElementById(viewMap[view]);
    if (targetView) {
        targetView.style.display = 'block';
        
        // 뷰별 초기화
        if (view === 'calendar' || view === 'stats') {
            renderCalendar();
            renderStats();
        }
    }
}

// 통계 카테고리 전환
function switchStatsCategory(category) {
    console.log('📊 [통계] 카테고리 전환:', category);
    
    // 탭 상태 업데이트
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        }
    });
    
    // 컨텐츠 표시
    document.querySelectorAll('.stats-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const contentMap = {
        'all': 'statsContentAll',
        'meal': 'statsContentMeal',
        'sleep': 'statsContentSleep',
        'exercise': 'statsContentExercise'
    };
    
    const targetContent = document.getElementById(contentMap[category]);
    if (targetContent) {
        targetContent.style.display = 'block';
    }
    
    // 달력 범례 업데이트
    updateCalendarLegend(category);
    
    // 달력 다시 렌더링 (카테고리별 색상 표시)
    renderCalendar(category);
}

// 품질 선택
function selectQuality(type, quality) {
    if (type === 'sleep') {
        selectedSleepQuality = quality;
        // 버튼 상태 업데이트
        document.querySelectorAll('.section-icon:contains("😴") + h3')
            .closest('.routine-section')
            .querySelectorAll('.quality-btn')
            .forEach(btn => {
                btn.classList.remove('selected');
                if (btn.dataset.quality === quality) {
                    btn.classList.add('selected');
                }
            });
    } else if (type === 'mood') {
        selectedMood = quality;
        // 버튼 상태 업데이트
        const moodSection = Array.from(document.querySelectorAll('.routine-section'))
            .find(section => section.querySelector('.section-header h3')?.textContent.includes('기록'));
        if (moodSection) {
            moodSection.querySelectorAll('.quality-btn').forEach(btn => {
                btn.classList.remove('selected');
                if (btn.dataset.quality === quality) {
                    btn.classList.add('selected');
                }
            });
        }
    }
}

// 수분 추가
function addWater(amount) {
    waterAmount += amount;
    if (waterAmount > 5000) waterAmount = 5000; // 최대 5L
    updateWaterDisplay();
}

// 수분 초기화
function resetWater() {
    waterAmount = 0;
    updateWaterDisplay();
}

// 수분 표시 업데이트
function updateWaterDisplay() {
    document.getElementById('waterAmount').textContent = waterAmount;
    const percentage = Math.min((waterAmount / 2000) * 100, 100);
    document.getElementById('waterProgress').style.width = percentage + '%';
}

// 주사 시간 토글
function toggleInjectionTime() {
    const checkbox = document.getElementById('injectionCheck');
    const timeGroup = document.getElementById('injectionTimeGroup');
    timeGroup.style.display = checkbox.checked ? 'block' : 'none';
}

// 추가 영양제 추가
function addCustomSupplement() {
    const name = prompt('영양제 이름을 입력하세요:');
    if (name && name.trim()) {
        const list = document.querySelector('.supplement-list');
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `
            <input type="checkbox" name="supplement" value="${name.trim()}">
            <span>${name.trim()}</span>
        `;
        list.appendChild(label);
    }
}

// 식사 모달 열기
// 평점 선택
function selectRating(rating) {
    selectedRating = rating;
    updateRatingButtons();
}

function updateRatingButtons() {
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.dataset.rating) === selectedRating) {
            btn.classList.add('selected');
        }
    });
}

// 식사량 선택
function selectPortion(portion) {
    selectedPortion = portion;
    updatePortionButtons();
}

function updatePortionButtons() {
    document.querySelectorAll('.portion-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.portion === selectedPortion) {
            btn.classList.add('selected');
        }
    });
}

// 식사 저장
// 루틴 데이터 로드
async function loadRoutineData() {
    if (!selectedChildId) {
        console.warn('선택된 아이가 없습니다.');
        return;
    }
    
    const dateStr = formatDate(currentDate);
    console.log('=== loadRoutineData 호출 ===', dateStr);
    
    // 아이 정보를 가져와서 만나이 자동 계산 (항상 실행)
    setTimeout(() => {
        try {
            const childrenJson = localStorage.getItem('children');
            if (childrenJson) {
                const children = JSON.parse(childrenJson);
                const child = children.find(c => c.id === selectedChildId);
                if (child) {
                    console.log('만나이 재계산 중...');
                    calculateAge(child);
                }
            }
        } catch (error) {
            console.error('아이 정보 로드 오류:', error);
        }
    }, 50);
    
    try {
        // DB에서 데이터 로드
        console.log('💾 [로드] DB에서 데이터 가져오기:', { child_id: selectedChildId, date: dateStr });
        
        const { data: dbData, error } = await supabase
            .from('daily_routines')
            .select('*')
            .eq('child_id', selectedChildId)
            .eq('routine_date', dateStr)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = 데이터 없음 (정상)
            console.error('❌ [로드] DB 조회 실패:', error);
        }
        
        if (dbData) {
            console.log('✅ [로드] DB 데이터 발견:', dbData);
            
            // 기본 측정 탭 데이터 복원
            if (dbData.weight !== null) {
                const weightEl = document.getElementById('weight');
                if (weightEl) weightEl.value = dbData.weight;
            }
            if (dbData.height !== null) {
                const heightEl = document.getElementById('height');
                if (heightEl) {
                    heightEl.value = dbData.height;
                    calculateBasicPrediction();
                }
            }
            if (dbData.predicted_height_basic !== null) {
                const predEl = document.getElementById('predictedHeightBasic');
                if (predEl) predEl.value = dbData.predicted_height_basic;
            }
            
            // 자세히 측정 탭 데이터 복원
            if (dbData.age_at_routine !== null) {
                const ageDetailedEl = document.getElementById('actualAgeDetailed');
                if (ageDetailedEl) ageDetailedEl.value = dbData.age_at_routine;
            }
            if (dbData.bone_age !== null) {
                const boneAgeEl = document.getElementById('boneAge');
                if (boneAgeEl) boneAgeEl.value = dbData.bone_age;
            }
            if (dbData.height !== null) {
                const heightDetailedEl = document.getElementById('heightDetailed');
                if (heightDetailedEl) heightDetailedEl.value = dbData.height;
            }
            if (dbData.predicted_height_bone_age !== null) {
                const predBoneEl = document.getElementById('predictedHeightBoneAge');
                if (predBoneEl) predBoneEl.value = dbData.predicted_height_bone_age;
            }
            if (dbData.measurement_notes) {
                const notesDetailedEl = document.getElementById('measurementNotesDetailed');
                if (notesDetailedEl) notesDetailedEl.value = dbData.measurement_notes;
            }
            
            // 기타 데이터
            if (dbData.sleep_time) {
                const sleepEl = document.getElementById('sleepTime');
                if (sleepEl) sleepEl.value = dbData.sleep_time;
            }
            if (dbData.wake_time) {
                const wakeEl = document.getElementById('wakeTime');
                if (wakeEl) wakeEl.value = dbData.wake_time;
            }
            if (dbData.sleep_quality) selectedSleepQuality = dbData.sleep_quality;
            if (dbData.water_amount !== null) {
                waterAmount = dbData.water_amount;
                updateWaterDisplay();
            }
            if (dbData.meals) meals = dbData.meals;
            if (dbData.exercises) {
                // exercises 배열을 selectedExercises 객체로 변환
                selectedExercises = {};
                dbData.exercises.forEach(ex => {
                    if (ex && ex.id) selectedExercises[ex.id] = true;
                });
            }
            if (dbData.supplements) {
                // 영양제 체크박스 복원
                const checkboxes = document.querySelectorAll('input[name="supplement"]');
                checkboxes.forEach(cb => {
                    cb.checked = dbData.supplements.includes(cb.value);
                });
            }
            if (dbData.growth_injection !== null) {
                const injectionCheck = document.getElementById('injectionCheck');
                if (injectionCheck) injectionCheck.checked = dbData.growth_injection;
            }
            if (dbData.injection_time) {
                const injectionTime = document.getElementById('injectionTime');
                if (injectionTime) injectionTime.value = dbData.injection_time;
            }
            if (dbData.notes) {
                const notesEl = document.getElementById('dailyNotes');
                if (notesEl) notesEl.value = dbData.notes;
            }
            if (dbData.mood) selectedMood = dbData.mood;
            
            // UI 업데이트
            updateMealStatuses();
            renderExerciseList();
            
            console.log('✅ [로드] 데이터 복원 완료');
            
        } else {
            // DB에 데이터 없으면 localStorage 확인 (백업)
            console.log('💾 [로드] DB 데이터 없음, localStorage 확인');
            const storageKey = `routine_${selectedChildId}_${dateStr}`;
            const routineData = localStorage.getItem(storageKey);
            
            if (routineData) {
                console.log('✅ [로드] localStorage 데이터 발견');
                loadFromLocalStorage(routineData);
            } else {
                console.log('💾 [로드] 데이터 없음, 초기화');
                resetForm();
                loadRecentMeasurements();
                
                // 만나이 재계산 (데이터 없을 때도 표시)
                setTimeout(() => {
                    calculateAge();
                }, 100);
            }
        }
        
    } catch (err) {
        console.error('❌ [로드] 예외 발생:', err);
        // 에러 시 localStorage 폴백
        const storageKey = `routine_${selectedChildId}_${dateStr}`;
        const routineData = localStorage.getItem(storageKey);
        if (routineData) {
            loadFromLocalStorage(routineData);
        } else {
            resetForm();
            loadRecentMeasurements();
            
            // 만나이 재계산 (데이터 없을 때도 표시)
            setTimeout(() => {
                calculateAge();
            }, 100);
        }
    }
}

// localStorage에서 데이터 로드 (백업용)
function loadFromLocalStorage(routineData) {
    try {
        const data = JSON.parse(routineData);
        
        // 데이터 복원 로직 (기존 코드)
        if (data.weight !== undefined) {
            const weightEl = document.getElementById('weight');
            if (weightEl) weightEl.value = data.weight;
        }
        if (data.height !== undefined) {
            const heightEl = document.getElementById('height');
            if (heightEl) {
                heightEl.value = data.height;
                calculateBasicPrediction();
            }
        }
        if (data.predictedHeightBasic !== undefined) {
            const predEl = document.getElementById('predictedHeightBasic');
            if (predEl) predEl.value = data.predictedHeightBasic;
        }
        
        // 자세히 측정 탭
        if (data.actualAgeDetailed !== undefined) {
            const ageDetailedEl = document.getElementById('actualAgeDetailed');
            if (ageDetailedEl) ageDetailedEl.value = data.actualAgeDetailed;
        }
        if (data.boneAge !== undefined) {
            const boneAgeEl = document.getElementById('boneAge');
            if (boneAgeEl) boneAgeEl.value = data.boneAge;
        }
        if (data.height !== undefined) {
            const heightDetailedEl = document.getElementById('heightDetailed');
            if (heightDetailedEl) heightDetailedEl.value = data.height;
        }
        if (data.predictedHeightBoneAge !== undefined) {
            const predBoneEl = document.getElementById('predictedHeightBoneAge');
            if (predBoneEl) predBoneEl.value = data.predictedHeightBoneAge;
        }
        if (data.measurementNotesDetailed !== undefined) {
            const notesDetailedEl = document.getElementById('measurementNotesDetailed');
            if (notesDetailedEl) notesDetailedEl.value = data.measurementNotesDetailed;
        }
        
        // 기타
        if (data.sleepTime) {
            const sleepEl = document.getElementById('sleepTime');
            if (sleepEl) sleepEl.value = data.sleepTime;
        }
        if (data.wakeTime) {
            const wakeEl = document.getElementById('wakeTime');
            if (wakeEl) wakeEl.value = data.wakeTime;
        }
        if (data.sleepQuality) selectedSleepQuality = data.sleepQuality;
        if (data.waterAmount !== undefined) {
            waterAmount = data.waterAmount;
            updateWaterDisplay();
        }
        if (data.meals) meals = data.meals;
        if (data.selectedExercises) selectedExercises = data.selectedExercises;
        if (data.notes) {
            const notesEl = document.getElementById('dailyNotes');
            if (notesEl) notesEl.value = data.notes;
        }
        if (data.mood) selectedMood = data.mood;
        
        updateMealStatuses();
        renderExerciseList();
        
    } catch (e) {
        console.error('localStorage 데이터 로드 오류:', e);
    }
}

// 최근 측정치 로드 (키/몸무게 기본값 설정)
function loadRecentMeasurements() {
    if (!selectedChildId) return;
    
    console.log('📊 [최근 측정치] 로드 시작');
    
    // localStorage에서 해당 아이의 모든 routine 데이터 검색
    const allKeys = Object.keys(localStorage);
    const routineKeys = allKeys.filter(key => key.startsWith(`routine_${selectedChildId}_`));
    
    if (routineKeys.length === 0) {
        console.log('📊 [최근 측정치] 저장된 데이터 없음');
        return;
    }
    
    // 날짜별로 정렬 (최신순)
    const sortedKeys = routineKeys.sort().reverse();
    
    // 최근 데이터에서 키와 몸무게 찾기
    let recentHeight = null;
    let recentWeight = null;
    
    for (const key of sortedKeys) {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            
            // 키 찾기
            if (!recentHeight && data.height) {
                recentHeight = data.height;
            }
            if (!recentHeight && data.heightDetailed) {
                recentHeight = data.heightDetailed;
            }
            
            // 몸무게 찾기
            if (!recentWeight && data.weight) {
                recentWeight = data.weight;
            }
            
            // 둘 다 찾으면 종료
            if (recentHeight && recentWeight) break;
        } catch (e) {
            console.error('데이터 파싱 오류:', e);
        }
    }
    
    // 기본값 설정
    if (recentHeight) {
        const heightEl = document.getElementById('height');
        if (heightEl && !heightEl.value) {
            heightEl.value = recentHeight;
            console.log('📊 [최근 측정치] 키:', recentHeight, 'cm');
            // 예측키 자동 계산
            calculateBasicPrediction();
        }
    }
    
    if (recentWeight) {
        const weightEl = document.getElementById('weight');
        if (weightEl && !weightEl.value) {
            weightEl.value = recentWeight;
            console.log('📊 [최근 측정치] 몸무게:', recentWeight, 'kg');
        }
    }
}

// 폼 초기화
function resetForm() {
    // 기본 측정
    const ageEl = document.getElementById('actualAge');
    if (ageEl) ageEl.value = '';
    const weightEl = document.getElementById('weight');
    if (weightEl) weightEl.value = '';
    const heightEl = document.getElementById('height');
    if (heightEl) heightEl.value = '';
    const predBasicEl = document.getElementById('predictedHeightBasic');
    if (predBasicEl) predBasicEl.value = '--';
    
    // 자세히 측정
    const ageDetailedEl = document.getElementById('actualAgeDetailed');
    if (ageDetailedEl) ageDetailedEl.value = '';
    const boneAgeEl = document.getElementById('boneAge');
    if (boneAgeEl) boneAgeEl.value = '';
    const heightDetailedEl = document.getElementById('heightDetailed');
    if (heightDetailedEl) heightDetailedEl.value = '--';
    const predBoneEl = document.getElementById('predictedHeightBoneAge');
    if (predBoneEl) predBoneEl.value = '';
    const notesDetailedEl = document.getElementById('measurementNotesDetailed');
    if (notesDetailedEl) notesDetailedEl.value = '';
    
    // 기타
    const sleepEl = document.getElementById('sleepTime');
    if (sleepEl) sleepEl.value = '22:00';
    const wakeEl = document.getElementById('wakeTime');
    if (wakeEl) wakeEl.value = '07:00';
    const notesEl = document.getElementById('dailyNotes');
    if (notesEl) notesEl.value = '';
    
    waterAmount = 0;
    updateWaterDisplay();
    meals = { breakfast: null, lunch: null, dinner: null, snack: null };
    selectedExercises = {};
    updateMealStatuses();
    renderExerciseList();
}

// 식사 상태 업데이트
function updateMealStatuses() {
    ['breakfast', 'lunch', 'dinner', 'snack'].forEach(type => {
        updateMealStatus(type);
    });
}

// 루틴 저장
async function saveRoutine() {
    if (!selectedChildId) {
        alert('아이를 먼저 선택해주세요.');
        return;
    }
    
    const weight = document.getElementById('weight');
    if (!weight || !weight.value) {
        alert('몸무게는 필수 입력 항목입니다.');
        return;
    }
    
    // 기본 측정 데이터
    const actualAge = document.getElementById('actualAge');
    const height = document.getElementById('height');
    const predictedHeightBasic = document.getElementById('predictedHeightBasic');
    
    // 자세히 측정 데이터
    const actualAgeDetailed = document.getElementById('actualAgeDetailed');
    const boneAge = document.getElementById('boneAge');
    const heightDetailed = document.getElementById('heightDetailed');
    const predictedHeightBoneAge = document.getElementById('predictedHeightBoneAge');
    const measurementNotesDetailed = document.getElementById('measurementNotesDetailed');
    
    // 기타 데이터
    const sleepTime = document.getElementById('sleepTime');
    const wakeTime = document.getElementById('wakeTime');
    const dailyNotes = document.getElementById('dailyNotes');
    const injectionCheck = document.getElementById('injectionCheck');
    const injectionTime = document.getElementById('injectionTime');
    
    const dateStr = formatDate(currentDate);
    
    // Supabase에 저장할 데이터
    const dbData = {
        child_id: selectedChildId,
        routine_date: dateStr,
        age_at_routine: actualAge && actualAge.value ? parseFloat(actualAge.value) : null,
        height: height && height.value ? parseFloat(height.value) : null,
        weight: parseFloat(weight.value),
        predicted_height_basic: predictedHeightBasic && predictedHeightBasic.value && predictedHeightBasic.value !== '--' 
            ? parseFloat(predictedHeightBasic.value) : null,
        bone_age: boneAge && boneAge.value ? parseFloat(boneAge.value) : null,
        predicted_height_bone_age: predictedHeightBoneAge && predictedHeightBoneAge.value && predictedHeightBoneAge.value !== '--'
            ? parseFloat(predictedHeightBoneAge.value) : null,
        measurement_notes: measurementNotesDetailed ? measurementNotesDetailed.value : null,
        sleep_time: sleepTime ? sleepTime.value : '22:00',
        wake_time: wakeTime ? wakeTime.value : '07:00',
        sleep_quality: selectedSleepQuality,
        water_amount: waterAmount,
        meals: meals,
        exercises: Object.keys(selectedExercises).filter(id => selectedExercises[id]).map(id => {
            const exercise = findExerciseById(id);
            return exercise ? { id: id, name: exercise.name, duration: exercise.duration || 30 } : null;
        }).filter(e => e),
        supplements: getSelectedSupplements(),
        growth_injection: injectionCheck ? injectionCheck.checked : false,
        injection_time: (injectionCheck && injectionCheck.checked && injectionTime) ? injectionTime.value : null,
        notes: dailyNotes ? dailyNotes.value : null,
        mood: selectedMood
    };
    
    console.log('💾 [저장] DB 저장 시작:', dbData);
    
    try {
        // 기존 데이터 확인 (upsert 사용)
        const { data, error } = await supabase
            .from('daily_routines')
            .upsert([dbData], {
                onConflict: 'child_id,routine_date'
            })
            .select();
        
        if (error) {
            console.error('❌ [저장] DB 저장 실패:', error);
            alert('저장 중 오류가 발생했습니다: ' + error.message);
            return;
        }
        
        console.log('✅ [저장] DB 저장 성공:', data);
        
        // localStorage에도 저장 (백업 및 오프라인 지원)
        const localData = {
            childId: selectedChildId,
            date: dateStr,
            actualAge: actualAge ? actualAge.value : '',
            height: height ? height.value : '',
            weight: weight.value,
            predictedHeightBasic: predictedHeightBasic ? predictedHeightBasic.value : '',
            actualAgeDetailed: actualAgeDetailed ? actualAgeDetailed.value : '',
            boneAge: boneAge ? boneAge.value : '',
            heightDetailed: heightDetailed ? heightDetailed.value : '',
            predictedHeightBoneAge: predictedHeightBoneAge ? predictedHeightBoneAge.value : '',
            measurementNotesDetailed: measurementNotesDetailed ? measurementNotesDetailed.value : '',
            sleepTime: sleepTime ? sleepTime.value : '22:00',
            wakeTime: wakeTime ? wakeTime.value : '07:00',
            sleepQuality: selectedSleepQuality,
            waterAmount: waterAmount,
            supplements: getSelectedSupplements(),
            injection: injectionCheck ? injectionCheck.checked : false,
            injectionTime: injectionTime ? injectionTime.value : '',
            meals: meals,
            selectedExercises: selectedExercises,
            notes: dailyNotes ? dailyNotes.value : '',
            mood: selectedMood,
            savedAt: new Date().toISOString()
        };
        
        const storageKey = `routine_${selectedChildId}_${dateStr}`;
        localStorage.setItem(storageKey, JSON.stringify(localData));
        
        alert('✅ 저장되었습니다!');
        
        // 성장 진단 팝업이 열려있으면 자동 업데이트
        if (window.growthDiagnosisModal && window.growthDiagnosisModal.isOpen) {
            console.log('📊 성장 진단 팝업 자동 업데이트');
            window.growthDiagnosisModal.loadGrowthRecords();
        }
        
    } catch (err) {
        console.error('❌ [저장] 예외 발생:', err);
        alert('저장 중 오류가 발생했습니다.');
    }
}

// 운동 ID로 운동 정보 찾기
function findExerciseById(id) {
    if (typeof challengeData === 'undefined') return null;
    
    for (let category in challengeData.exercise) {
        const exercise = challengeData.exercise[category].find(e => e.id === id);
        if (exercise) return exercise;
    }
    return null;
}

// 선택된 영양제 가져오기
function getSelectedSupplements() {
    const checkboxes = document.querySelectorAll('input[name="supplement"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// 날짜 포맷
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 같은 날짜 확인
function isSameDay(date1, date2) {
    return formatDate(date1) === formatDate(date2);
}

// 달력 렌더링
function renderCalendar(category = 'all') {
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarTitle = document.getElementById('calendarTitle');
    
    if (!calendarGrid || !calendarTitle) return;
    
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    
    // 타이틀 업데이트
    calendarTitle.textContent = `${year}년 ${month + 1}월`;
    
    // 달력 그리드 생성
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay(); // 0(일) ~ 6(토)
    const daysInMonth = lastDay.getDate();
    
    // 그리드 HTML 생성
    let html = '<div class="calendar-weekdays">';
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    weekdays.forEach(day => {
        html += `<div class="calendar-weekday">${day}</div>`;
    });
    html += '</div><div class="calendar-days">';
    
    // 이전 달 빈 칸
    for (let i = 0; i < firstDayOfWeek; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // 현재 달 날짜
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const isToday = isCurrentMonth && today.getDate() === day;
        
        // 카테고리별 데이터 확인
        const categoryData = getCategoryDataForDate(dateStr, category);
        
        let classes = ['calendar-day'];
        if (isToday) classes.push('today');
        if (date > today) classes.push('future');
        
        // 카테고리별 색상 클래스 추가
        if (categoryData.status) {
            classes.push(`status-${categoryData.status}`);
        }
        
        html += `
            <div class="${classes.join(' ')}" onclick="selectCalendarDate('${dateStr}')">
                <div class="day-number">${day}</div>
                ${categoryData.status ? `<div class="day-indicator ${categoryData.status}"></div>` : ''}
            </div>
        `;
    }
    
    html += '</div>';
    calendarGrid.innerHTML = html;
    
    // 주간 통계 업데이트
    updateWeekStats();
}

// 날짜별 카테고리 데이터 확인
function getCategoryDataForDate(dateStr, category) {
    const selectedChildId = localStorage.getItem('selectedChildId');
    if (!selectedChildId) return { status: null };
    
    const key = `routine_${selectedChildId}_${dateStr}`;
    const dataStr = localStorage.getItem(key);
    
    if (!dataStr) return { status: null };
    
    try {
        const data = JSON.parse(dataStr);
        
        if (category === 'all') {
            // 전체: 데이터가 있으면 완료
            return { status: 'complete' };
        } else if (category === 'meal') {
            // 식사: 3끼 중 몇 끼 입력했는지
            const meals = data.meals || {};
            const mealCount = Object.keys(meals).filter(key => meals[key]).length;
            if (mealCount >= 3) return { status: 'excellent' };
            if (mealCount >= 2) return { status: 'good' };
            if (mealCount >= 1) return { status: 'fair' };
            return { status: null };
        } else if (category === 'sleep') {
            // 수면: 수면 품질
            const quality = data.sleepQuality || '';
            if (quality === 'good') return { status: 'excellent' };
            if (quality === 'normal') return { status: 'good' };
            if (quality === 'bad') return { status: 'fair' };
            return { status: null };
        } else if (category === 'exercise') {
            // 운동: 선택한 운동 개수
            const exercises = data.selectedExercises || [];
            if (exercises.length >= 3) return { status: 'excellent' };
            if (exercises.length >= 2) return { status: 'good' };
            if (exercises.length >= 1) return { status: 'fair' };
            return { status: null };
        }
        
        return { status: null };
    } catch (e) {
        console.error('데이터 파싱 오류:', e);
        return { status: null };
    }
}

// 달력 범례 업데이트
function updateCalendarLegend(category) {
    const legendEl = document.getElementById('calendarLegend');
    if (!legendEl) return;
    
    let html = '';
    
    if (category === 'all') {
        html = `
            <div class="legend-item">
                <div class="legend-dot complete"></div>
                <span>완료</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot today"></div>
                <span>오늘</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot empty"></div>
                <span>미입력</span>
            </div>
        `;
    } else if (category === 'meal') {
        html = `
            <div class="legend-item">
                <div class="legend-dot excellent"></div>
                <span>3끼 완료</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot good"></div>
                <span>2끼</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot fair"></div>
                <span>1끼</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot empty"></div>
                <span>미입력</span>
            </div>
        `;
    } else if (category === 'sleep') {
        html = `
            <div class="legend-item">
                <div class="legend-dot excellent"></div>
                <span>좋음</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot good"></div>
                <span>보통</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot fair"></div>
                <span>나쁨</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot empty"></div>
                <span>미입력</span>
            </div>
        `;
    } else if (category === 'exercise') {
        html = `
            <div class="legend-item">
                <div class="legend-dot excellent"></div>
                <span>3개 이상</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot good"></div>
                <span>2개</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot fair"></div>
                <span>1개</span>
            </div>
            <div class="legend-item">
                <div class="legend-dot empty"></div>
                <span>미입력</span>
            </div>
        `;
    }
    
    legendEl.innerHTML = html;
}

// 루틴 데이터 존재 여부 확인
function hasRoutineData(dateStr) {
    const data = localStorage.getItem('routine_' + dateStr);
    return data !== null;
}

// 달력에서 날짜 선택 (구버전 - routine-calendar-modal.js로 이동됨)
// function selectCalendarDate(dateStr) {
//     const parts = dateStr.split('-');
//     currentDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
//     
//     // 입력 뷰로 전환
//     switchView('input');
//     
//     // 날짜 표시 업데이트
//     updateDateDisplay();
//     
//     // 데이터 로드
//     loadRoutineData();
// }

// 주간 통계 업데이트
function updateWeekStats() {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // 이번 주 일요일
    
    let completedDays = 0;
    let totalSleep = 0;
    let totalExercise = 0;
    let daysWithData = 0;
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        
        if (date <= today) {
            const dateStr = formatDate(date);
            const routineData = localStorage.getItem('routine_' + dateStr);
            
            if (routineData) {
                completedDays++;
                try {
                    const data = JSON.parse(routineData);
                    
                    // 수면 시간 계산
                    if (data.sleepTime && data.wakeTime) {
                        const sleepHours = calculateSleepHours(data.sleepTime, data.wakeTime);
                        totalSleep += sleepHours;
                        daysWithData++;
                    }
                    
                    // 운동 시간 계산 (선택된 운동 개수 * 15분 가정)
                    if (data.selectedExercises) {
                        const exerciseCount = Object.values(data.selectedExercises).filter(v => v).length;
                        totalExercise += exerciseCount * 15;
                    }
                } catch (e) {
                    console.error('데이터 파싱 오류:', e);
                }
            }
        }
    }
    
    // 완료율 계산 (오늘까지만)
    const daysUntilToday = Math.min(today.getDay() + 1, 7);
    const completionRate = daysUntilToday > 0 ? Math.round((completedDays / daysUntilToday) * 100) : 0;
    
    // UI 업데이트
    const weekCompletionElement = document.getElementById('weekCompletion');
    const weekCompletionBar = document.getElementById('weekCompletionBar');
    const avgSleepElement = document.getElementById('avgSleep');
    const totalExerciseElement = document.getElementById('totalExercise');
    
    if (weekCompletionElement) weekCompletionElement.textContent = completionRate;
    if (weekCompletionBar) weekCompletionBar.style.width = completionRate + '%';
    if (avgSleepElement) {
        const avgSleep = daysWithData > 0 ? (totalSleep / daysWithData).toFixed(1) : 0;
        avgSleepElement.textContent = avgSleep;
    }
    if (totalExerciseElement) totalExerciseElement.textContent = totalExercise;
}

// 수면 시간 계산 (시:분 형식)
function calculateSleepHours(sleepTime, wakeTime) {
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);
    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    
    let sleepMinutes = sleepHour * 60 + sleepMin;
    let wakeMinutes = wakeHour * 60 + wakeMin;
    
    // 다음날 기상인 경우
    if (wakeMinutes < sleepMinutes) {
        wakeMinutes += 24 * 60;
    }
    
    const totalMinutes = wakeMinutes - sleepMinutes;
    return totalMinutes / 60;
}

// 통계 렌더링
function renderStats() {
    // TODO: 통계 구현
    console.log('통계 렌더링');
}

// 달력 월 변경
function changeCalendarMonth(delta) {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + delta);
    renderCalendar();
}

// ===== 식사 사진 업로드 기능 =====

// 식사 사진 선택 핸들러
function handleMealPhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
        alert('사진 크기는 5MB 이하여야 합니다.');
        event.target.value = '';
        return;
    }
    
    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        event.target.value = '';
        return;
    }
    
    // 파일을 Base64로 변환하여 미리보기
    const reader = new FileReader();
    reader.onload = function(e) {
        currentMealPhoto = {
            dataUrl: e.target.result,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        };
        
        // 미리보기 표시
        showPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
}

// 사진 미리보기 표시
function showPhotoPreview(dataUrl) {
    const previewContainer = document.getElementById('photoPreviewContainer');
    const previewImg = document.getElementById('photoPreview');
    const uploadBtn = document.querySelector('.photo-upload-btn');
    
    previewImg.src = dataUrl;
    previewContainer.style.display = 'block';
    uploadBtn.style.display = 'none';
}

// 사진 미리보기 숨기기
function hidePhotoPreview() {
    const previewContainer = document.getElementById('photoPreviewContainer');
    const previewImg = document.getElementById('photoPreview');
    const uploadBtn = document.querySelector('.photo-upload-btn');
    
    previewImg.src = '';
    previewContainer.style.display = 'none';
    uploadBtn.style.display = 'inline-flex';
}

// 식사 사진 제거
function removeMealPhoto() {
    currentMealPhoto = null;
    document.getElementById('mealPhoto').value = '';
    hidePhotoPreview();
}

// 식사 모달 열기 (수정)
function openMealModal(mealType) {
    currentMealType = mealType;
    const modal = document.getElementById('mealModal');
    const title = document.getElementById('mealModalTitle');
    
    const mealNames = {
        'breakfast': '🌅 아침',
        'lunch': '🌞 점심',
        'dinner': '🌙 저녁',
        'snack': '🍪 간식'
    };
    
    title.textContent = mealNames[mealType] + ' 추가';
    
    // 기존 데이터 로드
    if (meals[mealType]) {
        document.getElementById('mealTime').value = meals[mealType].time || '';
        document.getElementById('mealDescription').value = meals[mealType].description || '';
        selectedRating = meals[mealType].rating || 0;
        selectedPortion = meals[mealType].portion || 'normal';
        
        // 사진 복원
        if (meals[mealType].photo) {
            currentMealPhoto = meals[mealType].photo;
            showPhotoPreview(currentMealPhoto.dataUrl);
        } else {
            currentMealPhoto = null;
            hidePhotoPreview();
        }
        
        // 버튼 상태 업데이트
        updateRatingButtons();
        updatePortionButtons();
    } else {
        // 초기화
        document.getElementById('mealTime').value = '';
        document.getElementById('mealDescription').value = '';
        selectedRating = 0;
        selectedPortion = 'normal';
        currentMealPhoto = null;
        hidePhotoPreview();
        updateRatingButtons();
        updatePortionButtons();
    }
    
    modal.style.display = 'flex';
}

// 식사 모달 닫기 (수정)
function closeMealModal() {
    document.getElementById('mealModal').style.display = 'none';
    // 사진 입력 필드 초기화
    document.getElementById('mealPhoto').value = '';
}

// 식사 저장 (수정)
function saveMeal() {
    const time = document.getElementById('mealTime').value;
    const description = document.getElementById('mealDescription').value;
    
    if (!description.trim()) {
        alert('식사 내용을 입력해주세요.');
        return;
    }
    
    meals[currentMealType] = {
        time: time,
        description: description,
        rating: selectedRating,
        portion: selectedPortion,
        photo: currentMealPhoto // 사진 데이터 저장
    };
    
    // 상태 업데이트
    updateMealStatus(currentMealType);
    closeMealModal();
}

// 식사 상태 업데이트 (수정 - 썸네일 표시)
function updateMealStatus(mealType) {
    const statusElement = document.getElementById(mealType + 'Status');
    const mealCard = statusElement.closest('.meal-card');
    
    if (meals[mealType]) {
        // 기존 썸네일 제거
        const existingThumbnail = mealCard.querySelector('.meal-thumbnail');
        if (existingThumbnail) {
            existingThumbnail.remove();
        }
        
        // 썸네일이 있으면 추가
        if (meals[mealType].photo) {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'meal-thumbnail';
            thumbnail.innerHTML = `<img src="${meals[mealType].photo.dataUrl}" alt="식사 사진">`;
            
            // meal-icon 다음에 썸네일 삽입
            const mealIcon = mealCard.querySelector('.meal-icon');
            mealIcon.after(thumbnail);
        }
        
        statusElement.textContent = '✓ 완료';
        mealCard.classList.add('completed');
    } else {
        // 미완료 상태로 복원
        const existingThumbnail = mealCard.querySelector('.meal-thumbnail');
        if (existingThumbnail) {
            existingThumbnail.remove();
        }
        statusElement.textContent = '+ 추가하기';
        mealCard.classList.remove('completed');
    }
}

// ===== 신체 측정 & 예측키 기능 =====

// 측정 탭 전환
function switchMeasurementTab(tab) {
    currentMeasurementTab = tab;
    
    // 탭 버튼 상태 업데이트
    document.querySelectorAll('.measurement-tab').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === tab) {
            t.classList.add('active');
        }
    });
    
    // 컨텐츠 전환
    document.querySelectorAll('.measurement-content').forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
    });
    
    if (tab === 'basic') {
        const basicEl = document.getElementById('basicMeasurement');
        if (basicEl) {
            basicEl.style.display = 'block';
            basicEl.classList.add('active');
        }
    } else if (tab === 'detailed') {
        const detailedEl = document.getElementById('detailedMeasurement');
        if (detailedEl) {
            detailedEl.style.display = 'block';
            detailedEl.classList.add('active');
        }
        
        // 자세히 측정 탭으로 전환 시 만나이 자동 복사
        const actualAgeBasic = document.getElementById('actualAge');
        const actualAgeDetailed = document.getElementById('actualAgeDetailed');
        if (actualAgeBasic && actualAgeDetailed && actualAgeBasic.value) {
            actualAgeDetailed.value = actualAgeBasic.value;
        }
        
        // 키 자동 복사 (기본 측정 → 자세히 측정)
        const heightBasic = document.getElementById('height');
        const heightDetailed = document.getElementById('heightDetailed');
        if (heightBasic && heightDetailed) {
            heightDetailed.value = heightBasic.value || '--';
        }
    }
}

// 기본 측정 탭의 예측키 계산 (통계 기반)
function calculateBasicPrediction() {
    console.log('=== calculateBasicPrediction 호출됨 ===');
    
    const heightEl = document.getElementById('height');
    const actualAgeEl = document.getElementById('actualAge');
    const predictedField = document.getElementById('predictedHeightBasic');
    
    console.log('요소 확인:', {
        heightEl: heightEl ? 'OK' : 'NULL',
        actualAgeEl: actualAgeEl ? 'OK' : 'NULL',
        predictedField: predictedField ? 'OK' : 'NULL'
    });
    
    if (!heightEl || !actualAgeEl || !predictedField) {
        console.error('필수 요소를 찾을 수 없습니다');
        return;
    }
    
    const height = parseFloat(heightEl.value);
    // 만나이 필드에서 숫자만 추출 (예: "10.5 세" -> 10.5)
    const actualAgeStr = actualAgeEl.value.replace(/[^0-9.]/g, '');
    const actualAge = parseFloat(actualAgeStr);
    
    console.log('입력 값:', { 
        height, 
        actualAge, 
        actualAgeStr,
        heightValue: heightEl.value,
        ageValue: actualAgeEl.value
    });
    
    if (!height || !actualAge || isNaN(height) || isNaN(actualAge)) {
        console.log('입력 값이 유효하지 않음 - 예측키 계산 불가');
        predictedField.value = '--';
        return;
    }
    
    // 성별 가져오기
    const gender = getSelectedChildGender();
    
    console.log('예측키 계산 시작:', { height, actualAge, gender });
    console.log('koreaGrowthStandard 확인:', typeof window.koreaGrowthStandard);
    console.log('isLoaded:', window.koreaGrowthStandard ? window.koreaGrowthStandard.isLoaded : 'N/A');
    
    // 통계 기반 예측키 계산
    if (typeof window.koreaGrowthStandard !== 'undefined' && window.koreaGrowthStandard.isLoaded) {
        try {
            const result = window.koreaGrowthStandard.predictAdultHeight(height, actualAge, gender);
            console.log('예측키 계산 결과:', result);
            
            if (result && result.predictedHeight) {
                predictedField.value = result.predictedHeight.toFixed(1) + ' cm';
                console.log('✅ 예측키 표시 완료:', predictedField.value);
            } else {
                predictedField.value = '계산 불가';
                console.warn('결과가 없음');
            }
        } catch (error) {
            console.error('예측키 계산 오류:', error);
            predictedField.value = '오류';
        }
    } else {
        console.warn('koreaGrowthStandard가 로드되지 않았습니다');
        predictedField.value = '데이터 로딩 중...';
        
        // 1초 후 재시도
        setTimeout(() => {
            console.log('재시도 중...');
            if (heightEl.value && actualAgeEl.value) {
                calculateBasicPrediction();
            }
        }, 1000);
    }
}

// 선택된 아이의 성별 가져오기
function getSelectedChildGender() {
    let gender = 'male'; // 기본값
    
    if (selectedChildId) {
        const childrenJson = localStorage.getItem('children');
        if (childrenJson) {
            try {
                const children = JSON.parse(childrenJson);
                const selectedChild = children.find(c => c.id == selectedChildId);
                if (selectedChild && selectedChild.gender) {
                    gender = selectedChild.gender;
                }
            } catch (e) {
                console.error('아이 정보 로드 오류:', e);
            }
        }
    }
    
    return gender;
}

// 예측키 계산 (기존 함수 - 호환성 유지)
function calculatePredictions() {
    // 현재 탭에 따라 적절한 함수 호출
    if (currentMeasurementTab === 'basic') {
        calculateBasicPrediction();
    }
    // 자세히 측정 탭에서는 자동 계산 없음 (사용자 직접 입력)
}

// ===== 성장 진단 팝업 =====

// 성장 진단 팝업 열기
function openGrowthDiagnosis() {
    if (!selectedChildId) {
        alert('아이를 먼저 선택해주세요.');
        return;
    }
    
    // GrowthDiagnosisModal이 없으면 생성
    if (!window.growthDiagnosisModal) {
        window.growthDiagnosisModal = new GrowthDiagnosisModal({
            onClose: () => {
                console.log('성장 진단 팝업 닫힘');
            }
        });
    }
    
    // 팝업 열기
    window.growthDiagnosisModal.open(selectedChildId);
}

// 성장 진단 팝업 닫기
function closeGrowthDiagnosis() {
    if (window.growthDiagnosisModal) {
        window.growthDiagnosisModal.close();
    }
}
