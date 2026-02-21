// 홈 페이지 스크립트

let homeGrowthChart = null;

// 즉시 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initApp() {
    cleanupInvalidChildren(); // 잘못된 데이터 정리
    initBirthDateInputs();
    loadChildren();
    loadBannerSlider();
    loadRecipeSlider(); // 레시피 슬라이더 추가
    loadCasesSlider(); // 치료 사례 슬라이더 추가
    loadPredictionRecords();
    loadChildStats();
    
    // 한국 표준 성장도표 초기화
    initKoreaGrowthStandard();
}

// 한국 표준 성장도표 초기화
async function initKoreaGrowthStandard() {
    if (window.koreaGrowthStandard) {
        try {
            console.log('📊 한국 표준 성장도표 초기화 중...');
            await window.koreaGrowthStandard.loadData();
            console.log('✅ 한국 표준 성장도표 초기화 완료');
        } catch (error) {
            console.error('❌ 한국 표준 성장도표 초기화 실패:', error);
        }
    } else {
        console.warn('⚠️ koreaGrowthStandard 객체를 찾을 수 없습니다');
    }
}

// 잘못된 아이 데이터 정리
function cleanupInvalidChildren() {
    try {
        const children = StorageManager.getChildren();
        let needsCleanup = false;
        
        const cleanedChildren = children.filter(child => {
            // birthDate가 유효한지 확인
            if (!child.birthDate) {
                console.warn('⚠️ birthDate가 없는 아이 발견:', child);
                needsCleanup = true;
                return false;
            }
            
            // 날짜가 유효한지 확인
            const testDate = new Date(child.birthDate);
            if (isNaN(testDate.getTime())) {
                console.warn('⚠️ 잘못된 birthDate:', child);
                needsCleanup = true;
                return false;
            }
            
            return true;
        });
        
        if (needsCleanup) {
            console.log('🧹 잘못된 데이터 정리 중...');
            console.log('이전:', children);
            console.log('이후:', cleanedChildren);
            localStorage.setItem('children', JSON.stringify(cleanedChildren));
        }
    } catch (error) {
        console.error('❌ 데이터 정리 실패:', error);
    }
}

// 생년월일 입력 필드 초기화
function initBirthDateInputs() {
    const yearInput = document.getElementById('childBirthYear');
    const monthInput = document.getElementById('childBirthMonth');
    const dayInput = document.getElementById('childBirthDay');
    
    if (!yearInput || !monthInput || !dayInput) return;
    
    // 입력 시 자동으로 hidden input 업데이트
    [yearInput, monthInput, dayInput].forEach(input => {
        input.addEventListener('input', updateBirthDateFromInputs);
        input.addEventListener('change', updateBirthDateFromInputs);
    });
}

// 생년월일 hidden input 업데이트
function updateBirthDateFromInputs() {
    const year = document.getElementById('childBirthYear').value;
    const month = document.getElementById('childBirthMonth').value;
    const day = document.getElementById('childBirthDay').value;
    
    if (year && month && day) {
        const paddedMonth = month.toString().padStart(2, '0');
        const paddedDay = day.toString().padStart(2, '0');
        document.getElementById('childBirthDate').value = `${year}-${paddedMonth}-${paddedDay}`;
    } else {
        document.getElementById('childBirthDate').value = '';
    }
}

// 아이 변경 이벤트 리스너
window.addEventListener('childChanged', function() {
    updateStats();
    loadChildStats();
});

// 아이 목록 로드 (컴팩트 버전)
function loadChildren() {
    const children = StorageManager.getChildren();
    const selectedChildId = StorageManager.getSelectedChildId();
    const container = document.getElementById('childrenList');
    
    console.log('🔍 로드된 아이 목록:', children);
    
    if (children.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 8px 0; color: #9ca3af; font-size: 0.875rem;">
                아이를 추가해주세요 👉
            </div>
        `;
        return;
    }
    
    container.innerHTML = children.map(child => {
        const isSelected = child.id === selectedChildId;
        const genderIcon = child.gender === 'male' ? '👦' : '👧';
        
        console.log('🔍 아이 데이터:', child.name, '생년월일:', child.birthDate);
        const age = calculateAge(child.birthDate);
        console.log('🔍 계산된 나이:', age);
        
        return `
            <div class="child-item-compact ${isSelected ? 'selected' : ''}">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;" onclick="selectChild('${child.id}')">
                    <div class="child-avatar-compact">${genderIcon}</div>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <div class="child-name-compact">${child.name}</div>
                        <div class="child-age-compact">만 ${age}세</div>
                    </div>
                </div>
                <div class="child-actions" style="display: flex; gap: 4px;">
                    <button class="child-action-btn" onclick="event.stopPropagation(); editChild('${child.id}')" title="수정">
                        ✏️
                    </button>
                    <button class="child-action-btn" onclick="event.stopPropagation(); confirmDeleteChild('${child.id}', '${child.name}')" title="삭제">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 나이 계산
function calculateAge(birthDate) {
    if (!birthDate) return 0;
    
    const today = new Date();
    const birth = new Date(birthDate);
    
    // 유효하지 않은 날짜
    if (isNaN(birth.getTime())) {
        console.error('올바르지 않은 생년월일:', birthDate);
        return 0;
    }
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// 배너 슬라이더 로드
let allGuideCards = []; // 전체 가이드 카드 저장

function loadBannerSlider() {
    // 성장 가이드 데이터 로드
    fetch('data/growth_guide.json')
        .then(response => response.json())
        .then(data => {
            const cards = data.cards || [];
            
            if (cards.length === 0) {
                console.error('카드 데이터가 없습니다');
                return;
            }
            
            console.log('✅ 성장 가이드 카드 로드:', cards.length + '개');
            
            // 전체 카드 저장
            allGuideCards = cards;
            
            // 랜덤으로 5개 선택
            const shuffled = cards.sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, 5);
            
            renderBannerSlider(selected);
        })
        .catch(error => {
            console.error('배너 데이터 로드 실패:', error);
            // 에러 시 빈 상태 표시
            document.getElementById('bannerSlider').innerHTML = `
                <div style="padding: 20px; text-align: center; color: #999; background: white; border-radius: 16px;">
                    <div style="font-size: 2rem; margin-bottom: 8px;">📚</div>
                    <div>배너를 불러오는 중...</div>
                </div>
            `;
        });
}

// 배너 슬라이더 렌더링
function renderBannerSlider(guides) {
    const container = document.getElementById('bannerSlider');
    const dotsContainer = document.getElementById('bannerDots');
    
    if (!guides || guides.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">배너를 불러올 수 없습니다</div>';
        return;
    }
    
    // 카테고리별 색상
    const categoryColors = {
        'basics': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'nutrition': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'clinic': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'lifestyle': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'communication': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    };
    
    // 배너 생성
    container.innerHTML = guides.map((guide, index) => {
        const color = categoryColors[guide.category] || categoryColors['basics'];
        const categoryName = {
            'basics': '성장 기초',
            'nutrition': '영양 관리',
            'clinic': '클리닉 정보',
            'lifestyle': '생활 습관',
            'communication': '부모 가이드'
        }[guide.category] || '성장 가이드';
        
        return `
            <div class="banner-item" style="background: ${color}" onclick="showBannerDetail('${guide.id}')" data-index="${index}">
                <div class="banner-icon">${guide.icon || '📚'}</div>
                <div class="banner-category">${categoryName}</div>
                <div class="banner-title">${guide.title}</div>
                <div class="banner-summary">${guide.summary || ''}</div>
            </div>
        `;
    }).join('');
    
    // dots 생성
    dotsContainer.innerHTML = guides.map((_, index) => 
        `<div class="banner-dot ${index === 0 ? 'active' : ''}" onclick="scrollToBanner(${index})"></div>`
    ).join('');
    
    // 스크롤 이벤트로 dots 업데이트
    let scrollTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            updateActiveDot();
        }, 100);
    });
}

// 배너로 스크롤
function scrollToBanner(index) {
    const container = document.getElementById('bannerSlider');
    const banners = container.querySelectorAll('.banner-item');
    
    if (banners[index]) {
        const banner = banners[index];
        const containerRect = container.getBoundingClientRect();
        const bannerRect = banner.getBoundingClientRect();
        const scrollLeft = container.scrollLeft + (bannerRect.left - containerRect.left);
        
        container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
    }
}

// 현재 활성 dot 업데이트
function updateActiveDot() {
    const container = document.getElementById('bannerSlider');
    const banners = container.querySelectorAll('.banner-item');
    
    if (banners.length === 0) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    
    let activeIndex = 0;
    let minDistance = Infinity;
    
    banners.forEach((banner, index) => {
        const bannerRect = banner.getBoundingClientRect();
        const bannerCenter = bannerRect.left + bannerRect.width / 2;
        const distance = Math.abs(containerCenter - bannerCenter);
        
        if (distance < minDistance) {
            minDistance = distance;
            activeIndex = index;
        }
    });
    
    // dots 업데이트
    document.querySelectorAll('.banner-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === activeIndex);
    });
}

// 배너 상세 보기
function showBannerDetail(guideId) {
    const guide = allGuideCards.find(card => card.id === guideId);
    
    if (!guide) {
        console.error('가이드를 찾을 수 없습니다:', guideId);
        return;
    }
    
    const modal = document.getElementById('bannerDetailModal');
    const titleElement = document.getElementById('bannerDetailTitle');
    const contentElement = document.getElementById('bannerDetailContent');
    
    // 카테고리 이름
    const categoryName = {
        'basics': '성장 기초',
        'nutrition': '영양 관리',
        'clinic': '클리닉 정보',
        'lifestyle': '생활 습관',
        'communication': '부모 가이드'
    }[guide.category] || '성장 가이드';
    
    // 제목 설정
    titleElement.innerHTML = `${guide.icon || '📚'} ${guide.title}`;
    
    // 내용 렌더링
    let contentHTML = `
        <div style="padding: 16px;">
            <!-- 카테고리 배지 -->
            <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 16px; border-radius: 20px; font-size: 0.875rem; margin-bottom: 16px;">
                ${categoryName}
            </div>
            
            <!-- 썸네일 이미지 -->
            ${guide.thumbnail ? `
                <div style="margin-bottom: 20px; border-radius: 12px; overflow: hidden;">
                    <img src="${guide.thumbnail}" alt="${guide.thumbnail_alt || guide.title}" 
                         style="width: 100%; height: auto; display: block; object-fit: cover;">
                </div>
            ` : ''}
            
            <!-- 요약 -->
            <div style="font-size: 1rem; color: #4b5563; margin-bottom: 20px; line-height: 1.6;">
                ${guide.summary || ''}
            </div>
            
            <!-- 핵심 포인트 -->
            ${guide.key_points && guide.key_points.length > 0 ? `
                <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                    <div style="font-weight: 700; font-size: 1rem; margin-bottom: 12px; color: #1f2937;">
                        ✨ 핵심 포인트
                    </div>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${guide.key_points.map(point => `
                            <li style="margin-bottom: 8px; color: #4b5563; line-height: 1.6;">${point}</li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <!-- 상세 내용 -->
            ${guide.detail && guide.detail.sections ? `
                <div style="margin-top: 20px;">
                    ${guide.detail.sections.map(section => {
                        if (section.type === 'intro') {
                            return `<p style="color: #4b5563; line-height: 1.7; margin-bottom: 16px;">${section.content}</p>`;
                        } else if (section.type === 'explanation') {
                            return `
                                <div style="margin-bottom: 20px;">
                                    <h4 style="font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 8px;">
                                        ${section.title}
                                    </h4>
                                    <p style="color: #4b5563; line-height: 1.7;">${section.content}</p>
                                </div>
                            `;
                        } else if (section.type === 'guide' && section.steps) {
                            return `
                                <div style="margin-bottom: 20px;">
                                    <h4 style="font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 12px;">
                                        ${section.title}
                                    </h4>
                                    <ol style="margin: 0; padding-left: 20px;">
                                        ${section.steps.map(step => `
                                            <li style="margin-bottom: 8px; color: #4b5563; line-height: 1.6;">${step}</li>
                                        `).join('')}
                                    </ol>
                                </div>
                            `;
                        }
                        return '';
                    }).join('')}
                </div>
            ` : ''}
            
            <!-- 태그 -->
            ${guide.tags && guide.tags.length > 0 ? `
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px;">
                    ${guide.tags.map(tag => `
                        <span style="background: #e5e7eb; color: #4b5563; padding: 4px 12px; border-radius: 12px; font-size: 0.875rem;">
                            #${tag}
                        </span>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    contentElement.innerHTML = contentHTML;
    modal.style.display = 'flex';
}

// 배너 상세 모달 닫기
function closeBannerDetailModal() {
    document.getElementById('bannerDetailModal').style.display = 'none';
}

// ==================== 치료 사례 슬라이더 ====================

// 치료 사례 슬라이더 로드
function loadCasesSlider() {
    fetch('data/cases.json')
        .then(response => response.json())
        .then(cases => {
            if (cases.length === 0) {
                console.log('치료 사례 데이터가 없습니다');
                return;
            }
            
            console.log('✅ 치료 사례 로드:', cases.length + '개');
            renderCasesSlider(cases);
        })
        .catch(error => {
            console.error('치료 사례 로드 실패:', error);
        });
}

// 치료 사례 슬라이더 렌더링
function renderCasesSlider(cases) {
    const container = document.getElementById('casesSlider');
    const dotsContainer = document.getElementById('casesDots');
    
    if (!cases || cases.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">사례를 불러올 수 없습니다</div>';
        return;
    }
    
    // 사례 카드 생성
    container.innerHTML = cases.map((caseItem, index) => {
        const genderEmoji = caseItem.gender === 'male' ? '👦' : '👧';
        const genderClass = caseItem.gender === 'male' ? 'male' : 'female';
        const genderText = caseItem.gender === 'male' ? '남아' : '여아';
        
        // 성장량 계산
        const firstMeasurement = caseItem.measurements[0];
        const lastMeasurement = caseItem.measurements[caseItem.measurements.length - 1];
        const growth = (lastMeasurement.height - firstMeasurement.height).toFixed(1);
        
        // 치료 기간 계산
        const startDate = new Date(firstMeasurement.date);
        const endDate = new Date(lastMeasurement.date);
        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (endDate.getMonth() - startDate.getMonth());
        const duration = monthsDiff > 0 ? `${monthsDiff}개월` : '진행중';
        
        return `
            <div class="case-card-home" onclick="openCaseDetailFromHome(${index})" data-index="${index}">
                <div class="case-card-header">
                    <div class="case-gender-badge ${genderClass}">${genderEmoji} ${genderText}</div>
                    <div class="case-name">${caseItem.name}</div>
                </div>
                
                <div class="case-summary">
                    ${firstMeasurement.height}cm → ${lastMeasurement.height}cm
                </div>
                
                <div class="case-stats-mini">
                    <div class="case-stat-mini">
                        <div class="case-stat-mini-label">성장</div>
                        <div class="case-stat-mini-value">+${growth}cm</div>
                    </div>
                    <div class="case-stat-mini">
                        <div class="case-stat-mini-label">기간</div>
                        <div class="case-stat-mini-value">${duration}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // dots 생성
    dotsContainer.innerHTML = cases.map((_, index) => 
        `<div class="banner-dot ${index === 0 ? 'active' : ''}" onclick="scrollToCase(${index})"></div>`
    ).join('');
    
    // 스크롤 이벤트로 dots 업데이트
    let scrollTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            updateActiveCaseDot();
        }, 100);
    });
}

// 사례로 스크롤
function scrollToCase(index) {
    const container = document.getElementById('casesSlider');
    const cases = container.querySelectorAll('.case-card-home');
    
    if (cases[index]) {
        cases[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

// 활성 dot 업데이트
function updateActiveCaseDot() {
    const container = document.getElementById('casesSlider');
    const cases = container.querySelectorAll('.case-card-home');
    
    if (cases.length === 0) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    
    let activeIndex = 0;
    let minDistance = Infinity;
    
    cases.forEach((caseCard, index) => {
        const caseRect = caseCard.getBoundingClientRect();
        const caseCenter = caseRect.left + caseRect.width / 2;
        const distance = Math.abs(containerCenter - caseCenter);
        
        if (distance < minDistance) {
            minDistance = distance;
            activeIndex = index;
        }
    });
    
    // dots 업데이트
    const dots = document.querySelectorAll('#casesDots .banner-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === activeIndex);
    });
}

// 홈에서 사례 상세 모달 열기
async function openCaseDetailFromHome(index) {
    try {
        const response = await fetch('data/cases.json');
        const cases = await response.json();
        const caseItem = cases[index];
        
        if (!caseItem) {
            console.error('사례를 찾을 수 없습니다:', index);
            return;
        }
        
        // 한국 표준 성장도표 데이터 로드 확인 및 대기
        if (window.koreaGrowthStandard) {
            if (!window.koreaGrowthStandard.isLoaded) {
                try {
                    console.log('📊 한국 표준 성장도표 로딩 중...');
                    await window.koreaGrowthStandard.loadData();
                    console.log('✅ 한국 표준 성장도표 로드 완료');
                } catch (error) {
                    console.error('❌ 한국 표준 성장도표 로드 실패:', error);
                }
            }
        } else {
            console.warn('⚠️ koreaGrowthStandard 객체가 없습니다');
        }
        
        await showCaseDetailModal(caseItem);
    } catch (error) {
        console.error('사례 로드 실패:', error);
    }
}

// 사례 상세 모달 표시
async function showCaseDetailModal(caseItem) {
    const modal = document.getElementById('caseDetailModal');
    const modalBody = document.getElementById('caseDetailBody');
    
    const measurements = caseItem.measurements || [];
    if (measurements.length === 0) return;
    
    const first = measurements[0];
    const last = measurements[measurements.length - 1];
    const growth = (last.height - first.height).toFixed(1);
    const genderText = caseItem.gender === 'male' ? '남아' : '여아';
    const genderEmoji = caseItem.gender === 'male' ? '👦' : '👧';
    
    // 치료 기간
    const startDate = new Date(first.date);
    const endDate = new Date(last.date);
    const months = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24 * 30));
    const duration = months > 0 ? `${months}개월` : '진행중';
    
    const age = calculateAgeAtDate(caseItem.birthDate, first.date);
    
    modalBody.innerHTML = `
        <div class="modal-section">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-color), var(--blue-color)); color: white; padding: 20px; border-radius: 16px; margin-bottom: 20px;">
                <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 0.875rem; margin-bottom: 8px;">${genderEmoji} ${genderText}</div>
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">${caseItem.name}</h2>
                <p style="font-size: 0.9rem; opacity: 0.95;"><span>만 ${age}세 내원</span> · <span>${duration} 치료</span></p>
            </div>
            
            ${caseItem.fatherHeight || caseItem.motherHeight || caseItem.targetHeight || caseItem.specialNotes ? `
            <div class="modal-section" style="margin-bottom: 24px;">
                <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 12px; color: var(--text-color);">👨‍👩‍👦 환자 정보</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f9fafb; padding: 16px; border-radius: 12px;">
                    ${caseItem.fatherHeight ? `
                        <div>
                            <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 4px;">아버지 키</div>
                            <div style="font-size: 1rem; font-weight: 600; color: var(--text-color);">${caseItem.fatherHeight}cm</div>
                        </div>
                    ` : ''}
                    ${caseItem.motherHeight ? `
                        <div>
                            <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 4px;">어머니 키</div>
                            <div style="font-size: 1rem; font-weight: 600; color: var(--text-color);">${caseItem.motherHeight}cm</div>
                        </div>
                    ` : ''}
                    ${caseItem.targetHeight ? `
                        <div>
                            <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 4px;">희망 키</div>
                            <div style="font-size: 1rem; font-weight: 600; color: var(--primary-color);">${caseItem.targetHeight}cm</div>
                        </div>
                    ` : ''}
                    ${caseItem.specialNotes ? `
                        <div style="grid-column: 1 / -1;">
                            <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 4px;">특이사항</div>
                            <div style="font-size: 0.9rem; color: var(--text-color);">${caseItem.specialNotes}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <div class="modal-section" style="margin-bottom: 24px;">
                <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 12px; color: var(--text-color);">📊 성장 결과 요약</h3>
                <div style="display: flex; gap: 8px;">
                <div style="flex: 1; background: #f0f9ff; padding: 16px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #60a5fa; margin-bottom: 4px;">치료 전</div>
                    <div style="font-size: 1.25rem; font-weight: 700; color: #1e40af;">${first.height}cm</div>
                </div>
                <div style="flex: 1; background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 16px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #d97706; margin-bottom: 4px;">성장량</div>
                    <div style="font-size: 1.25rem; font-weight: 700; color: #92400e;">+${growth}cm</div>
                </div>
                <div style="flex: 1; background: #f0fdf4; padding: 16px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 0.75rem; color: #4ade80; margin-bottom: 4px;">치료 후</div>
                    <div style="font-size: 1.25rem; font-weight: 700; color: #15803d;">${last.height}cm</div>
                </div>
            </div>
        </div>
        
        <div class="modal-section" style="margin-bottom: 24px;">
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 12px; color: var(--text-color);">📊 예측키 변화</h3>
            <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <canvas id="predictionComparisonChart" style="width: 100%; height: 250px;"></canvas>
            </div>
        </div>
        
        <div class="chart-section-fixed">
            <h3>📈 성장 그래프</h3>
            <div class="chart-wrapper-fixed">
                <canvas id="homeCaseChart"></canvas>
            </div>
        </div>
        
        <div class="modal-section">
            <h3>📅 측정 기록 (${measurements.length}회)</h3>
            <div class="measurements-timeline">
                ${measurements.map((m, i) => {
                    const mAge = calculateAgeAtDate(caseItem.birthDate, m.date);
                    const growthFromPrev = i === 0 ? '' : `+${(m.height - measurements[i-1].height).toFixed(1)}cm`;
                    const memoHtml = m.memo ? m.memo.replace(/\\n/g, '<br>') : '';
                    
                    return `
                        <div class="measurement-card" data-index="${i}" style="background: white; padding: 16px; border-radius: 12px; border: 2px solid transparent; transition: all 0.3s;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="background: linear-gradient(135deg, var(--primary-color), var(--blue-color)); color: white; width: 40px; height: 40px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                        <span style="font-size: 1.2rem; font-weight: 700; line-height: 1;">${i + 1}</span>
                                        <span style="font-size: 0.6rem; opacity: 0.9;">회차</span>
                                    </div>
                                    <div>
                                        <div style="font-size: 0.875rem; font-weight: 600; color: var(--text-color);">${m.date}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-light);">
                                            ${genderEmoji} 만 ${mAge}세
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: ${m.memo ? '12px' : '0'};">
                                <div style="text-align: center; background: #f9fafb; padding: 10px; border-radius: 8px;">
                                    <div style="font-size: 0.7rem; color: #9ca3af; margin-bottom: 2px;">키</div>
                                    <div style="font-size: 1rem; font-weight: 600; color: var(--text-color);">
                                        ${m.height}cm
                                        ${growthFromPrev ? `<div style="font-size: 0.7rem; color: #10b981; margin-top: 2px;">${growthFromPrev}</div>` : ''}
                                    </div>
                                </div>
                                
                                <div style="text-align: center; background: #f9fafb; padding: 10px; border-radius: 8px;">
                                    <div style="font-size: 0.7rem; color: #9ca3af; margin-bottom: 2px;">몸무게</div>
                                    <div style="font-size: 1rem; font-weight: 600; color: var(--text-color);">${m.weight}kg</div>
                                </div>
                                
                                <div id="prediction-${i}" style="background: #fffbeb; padding: 10px; border-radius: 8px;">
                                    ${mAge < 18 ? `
                                        <div style="text-align: center;">
                                            <div style="font-size: 0.7rem; color: #9ca3af; margin-bottom: 2px;">예상 최종 키</div>
                                            <div style="font-size: 0.9rem; color: #9ca3af;">계산 중...</div>
                                        </div>
                                    ` : `
                                        <div style="text-align: center;">
                                            <div style="font-size: 0.7rem; color: #9ca3af; margin-bottom: 2px;">예상 최종 키</div>
                                            <div style="font-size: 1rem; color: #9ca3af;">-</div>
                                        </div>
                                    `}
                                </div>
                            </div>
                            
                            ${m.memo ? `
                                <div style="background: #fef3c7; padding: 12px; border-radius: 8px; display: flex; gap: 8px; align-items: start;">
                                    <div style="font-size: 1.2rem;">📝</div>
                                    <div style="font-size: 0.875rem; color: #92400e; line-height: 1.5;">${memoHtml}</div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        
        ${caseItem.memo ? `
            <div class="modal-section">
                <h3>📝 종합 치료 메모</h3>
                <div class="memo-box">
                    <p style="white-space: pre-wrap; line-height: 1.8;">${caseItem.memo}</p>
                </div>
            </div>
        ` : ''}
    `;
    
    modal.style.display = 'flex';
    
    console.log('✅ 사례 상세 모달 열림:', caseItem.name);
    
    // 차트 생성 - DOM 렌더링 대기
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 예측키 계산 및 업데이트
    updatePredictionKeys(caseItem);
    
    // 예측키 비교 차트 생성
    createPredictionComparisonChart(caseItem);
    
    // 차트 생성
    createHomeCaseChart(caseItem);
    
    // 스크롤 하이라이트 설정
    setupScrollHighlightHome(caseItem);
}

// 스크롤 하이라이트 설정 (홈용)
function setupScrollHighlightHome(caseData) {
    const modalBody = document.getElementById('caseDetailBody');
    const cards = modalBody.querySelectorAll('.measurement-card');
    
    if (!cards.length || !homeCaseChart) {
        console.warn('⚠️ 카드 또는 차트가 없습니다');
        return;
    }
    
    // 차트 섹션의 고정 높이 가져오기
    const chartSection = document.querySelector('.chart-section-fixed');
    
    modalBody.addEventListener('scroll', () => {
        const modalRect = modalBody.getBoundingClientRect();
        const chartHeight = chartSection ? chartSection.offsetHeight : 0;
        
        // 트리거 포인트: 모달 상단 + 차트 높이 + 추가 오프셋 (50px)
        const triggerY = modalRect.top + chartHeight + 50;
        
        let highlightIndex = -1;
        
        cards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const cardTop = cardRect.top;
            const cardBottom = cardRect.bottom;
            
            // 카드가 트리거 포인트를 지나가고 있는지 확인
            if (cardTop <= triggerY && triggerY <= cardBottom) {
                highlightIndex = index;
            }
        });
        
        // 모든 카드 하이라이트 제거
        cards.forEach(card => {
            card.style.borderColor = 'transparent';
            card.style.boxShadow = 'none';
        });
        
        // 현재 카드 하이라이트
        if (highlightIndex >= 0) {
            cards[highlightIndex].style.borderColor = 'var(--primary-color)';
            cards[highlightIndex].style.boxShadow = '0 4px 12px rgba(20, 184, 166, 0.3)';
            updateChartHighlightHome(highlightIndex);
        }
    });
    
    console.log('✅ 스크롤 하이라이트 설정 완료');
}

// 차트 포인트 하이라이트 업데이트 (홈용)
function updateChartHighlightHome(highlightIndex) {
    if (!homeCaseChart) return;
    
    const datasets = homeCaseChart.data.datasets;
    // 환자 데이터셋은 order: 0
    const patientDataset = datasets.find(d => d.order === 0);
    
    if (!patientDataset || !patientDataset.data) {
        console.error('❌ 환자 데이터셋을 찾을 수 없습니다.');
        return;
    }
    
    // 포인트 크기 및 색상 업데이트
    patientDataset.pointRadius = patientDataset.data.map((_, index) => 
        index === highlightIndex ? 14 : 10
    );
    patientDataset.pointHoverRadius = patientDataset.data.map((_, index) => 
        index === highlightIndex ? 16 : 12
    );
    patientDataset.pointBackgroundColor = patientDataset.data.map((_, index) => 
        index === highlightIndex ? '#f59e0b' : '#dc2626'  // 노란색 : 빨간색
    );
    patientDataset.pointBorderWidth = patientDataset.data.map((_, index) => 
        index === highlightIndex ? 3 : 3
    );
    
    homeCaseChart.update('none'); // 애니메이션 없이 즉시 업데이트
}

// 예측키 업데이트 (모달이 열린 후 실행)
function updatePredictionKeys(caseItem) {
    console.log('🔄 예측키 업데이트 시작');
    console.log('   - koreaGrowthStandard 존재:', !!window.koreaGrowthStandard);
    console.log('   - isLoaded:', window.koreaGrowthStandard?.isLoaded);
    
    if (!window.koreaGrowthStandard) {
        console.error('❌ koreaGrowthStandard 객체가 없습니다');
        return;
    }
    
    if (!window.koreaGrowthStandard.isLoaded) {
        console.warn('⚠️ koreaGrowthStandard가 로드되지 않았습니다');
        return;
    }
    
    const measurements = caseItem.measurements || [];
    console.log('📊 측정 기록 개수:', measurements.length);
    
    measurements.forEach((m, i) => {
        const mAge = calculateAgeAtDate(caseItem.birthDate, m.date);
        
        console.log(`\n--- 회차 ${i+1} ---`);
        console.log(`   나이: ${mAge}세, 키: ${m.height}cm`);
        
        if (mAge < 18) {
            try {
                const prediction = window.koreaGrowthStandard.predictAdultHeight(
                    m.height,
                    mAge,
                    caseItem.gender === 'male' ? 'male' : 'female'
                );
                
                console.log(`   예측 결과:`, prediction);
                
                if (prediction) {
                    // 해당 회차의 예측키 영역 찾기
                    const predictionElement = document.querySelector(`#prediction-${i}`);
                    console.log(`   Element 찾기: #prediction-${i}`, !!predictionElement);
                    
                    if (predictionElement) {
                        predictionElement.innerHTML = 
                            '<div style="text-align: center;">' +
                                '<div style="font-size: 0.7rem; color: #9ca3af; margin-bottom: 2px;">' +
                                    '예상 최종 키 (18세) ' +
                                    '<button onclick="showPredictionMethodModal(); event.stopPropagation();" style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; background: #e5e7eb; border: none; font-size: 0.7rem; color: #6b7280; cursor: pointer; margin-left: 4px;">?</button>' +
                                '</div>' +
                                '<div style="font-size: 1.1rem; font-weight: 600; color: #f59e0b;">' +
                                    prediction.predictedHeight + 'cm' +
                                '</div>' +
                                '<div style="font-size: 0.65rem; color: #9ca3af; margin-top: 2px;">' +
                                    '현재 ' + prediction.percentile.toFixed(1) + '% 유지 시' +
                                '</div>' +
                            '</div>';
                        console.log(`   ✅ 예측키 업데이트 완료: ${prediction.predictedHeight}cm`);
                    } else {
                        console.error(`   ❌ Element를 찾을 수 없습니다: #prediction-${i}`);
                    }
                }
            } catch (error) {
                console.error(`   ❌ 예측키 계산 실패:`, error);
            }
        } else {
            console.log(`   ⏭️ 18세 이상, 예측 불필요`);
        }
    });
    
    console.log('\n✅ 모든 예측키 업데이트 완료');
}

// 예측키 비교 차트 생성
function createPredictionComparisonChart(caseItem) {
    const canvas = document.getElementById('predictionComparisonChart');
    if (!canvas) {
        console.error('❌ predictionComparisonChart 캔버스를 찾을 수 없습니다');
        return;
    }
    
    const measurements = caseItem.measurements || [];
    if (measurements.length < 2) {
        console.log('⚠️ 측정 기록이 2개 미만입니다. 비교 차트를 생성하지 않습니다.');
        return;
    }
    
    const first = measurements[0];
    const last = measurements[measurements.length - 1];
    
    const firstAge = calculateAgeAtDate(caseItem.birthDate, first.date);
    const lastAge = calculateAgeAtDate(caseItem.birthDate, last.date);
    
    // 예측키 계산
    let firstPrediction = null;
    let lastPrediction = null;
    
    if (window.koreaGrowthStandard && window.koreaGrowthStandard.isLoaded) {
        try {
            if (firstAge < 18) {
                firstPrediction = window.koreaGrowthStandard.predictAdultHeight(
                    first.height,
                    firstAge,
                    caseItem.gender === 'male' ? 'male' : 'female'
                );
            }
            if (lastAge < 18) {
                lastPrediction = window.koreaGrowthStandard.predictAdultHeight(
                    last.height,
                    lastAge,
                    caseItem.gender === 'male' ? 'male' : 'female'
                );
            }
        } catch (error) {
            console.error('❌ 예측키 계산 실패:', error);
        }
    }
    
    if (!firstPrediction || !lastPrediction) {
        console.log('⚠️ 예측키를 계산할 수 없습니다.');
        canvas.parentElement.style.display = 'none';
        return;
    }
    
    const difference = (lastPrediction.predictedHeight - firstPrediction.predictedHeight).toFixed(1);
    const percentageChange = ((difference / firstPrediction.predictedHeight) * 100).toFixed(1);
    
    const ctx = canvas.getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [
                `첫 방문\n(만 ${firstAge}세)`,
                `최근 측정\n(만 ${lastAge}세)`
            ],
            datasets: [{
                label: '예측키 (cm)',
                data: [firstPrediction.predictedHeight, lastPrediction.predictedHeight],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',  // 파란색
                    'rgba(34, 197, 94, 0.8)'    // 초록색
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(34, 197, 94, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `예측 최종 키: ${context.parsed.y}cm`;
                        }
                    }
                },
                title: {
                    display: true,
                    text: `예측키 변화: ${difference > 0 ? '+' : ''}${difference}cm (${percentageChange > 0 ? '+' : ''}${percentageChange}%)`,
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    color: difference > 0 ? '#16a34a' : '#dc2626',
                    padding: {
                        bottom: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: Math.min(firstPrediction.predictedHeight, lastPrediction.predictedHeight) - 5,
                    max: Math.max(firstPrediction.predictedHeight, lastPrediction.predictedHeight) + 5,
                    title: {
                        display: true,
                        text: '예측 최종 키 (cm)',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ 예측키 비교 차트 생성 완료');
    console.log(`   첫 방문: ${firstPrediction.predictedHeight}cm`);
    console.log(`   최근 측정: ${lastPrediction.predictedHeight}cm`);
    console.log(`   변화: ${difference}cm (${percentageChange}%)`);
}

// 레시피 배너 슬라이더 로드
async function loadRecipeSlider() {
    try {
        const response = await fetch('data/recipes.json');
        const data = await response.json();
        const allRecipes = data.recipes;
        
        // 랜덤으로 5개 선택
        const shuffled = [...allRecipes].sort(() => Math.random() - 0.5);
        const selectedRecipes = shuffled.slice(0, 5);
        
        const slider = document.getElementById('recipeSlider');
        const dots = document.getElementById('recipeDots');
        
        if (!slider || !dots) return;
        
        // 슬라이더 카드 생성
        slider.innerHTML = selectedRecipes.map(recipe => `
            <div class="banner-card" onclick="showRecipeDetail('${recipe.id}')">
                <div class="banner-image" style="background-image: url('${recipe.image}'); background-size: cover; background-position: center;">
                    <div class="banner-overlay"></div>
                    <div class="banner-content">
                        <div class="banner-category">${recipe.number}</div>
                        <div class="banner-title">${recipe.title}</div>
                        <div class="banner-description">${recipe.growth_benefit.description}</div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // 도트 생성
        dots.innerHTML = selectedRecipes.map((_, index) => `
            <div class="banner-dot ${index === 0 ? 'active' : ''}" onclick="scrollRecipeToBanner(${index})"></div>
        `).join('');
        
        // 스크롤 이벤트
        let recipeScrollTimeout;
        slider.addEventListener('scroll', () => {
            clearTimeout(recipeScrollTimeout);
            recipeScrollTimeout = setTimeout(() => {
                const scrollLeft = slider.scrollLeft;
                const cardWidth = slider.querySelector('.banner-card').offsetWidth + 12;
                const activeIndex = Math.round(scrollLeft / cardWidth);
                
                document.querySelectorAll('#recipeDots .banner-dot').forEach((dot, index) => {
                    dot.classList.toggle('active', index === activeIndex);
                });
            }, 100);
        });
        
        console.log('✅ 레시피 슬라이더 로드 완료:', selectedRecipes.length, '개');
    } catch (error) {
        console.error('❌ 레시피 슬라이더 로드 실패:', error);
    }
}

// 레시피 배너 스크롤
function scrollRecipeToBanner(index) {
    const slider = document.getElementById('recipeSlider');
    if (!slider) return;
    
    const cardWidth = slider.querySelector('.banner-card').offsetWidth + 12;
    slider.scrollTo({
        left: cardWidth * index,
        behavior: 'smooth'
    });
}

// 오늘의 레시피 로드 (사용하지 않음 - 삭제 가능)

// 레시피 상세 보기
async function showRecipeDetail(recipeId) {
    try {
        const response = await fetch('data/recipes.json');
        const data = await response.json();
        const recipe = data.recipes.find(r => r.id === recipeId);
        
        if (!recipe) {
            console.error('레시피를 찾을 수 없습니다:', recipeId);
            return;
        }
        
        // 모달 생성
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
                <div class="recipe-modal-header">
                    <div class="recipe-modal-title">${recipe.title}</div>
                    <div class="recipe-modal-badge">${recipe.number}</div>
                    <button class="modal-close" onclick="this.closest('.modal').remove()" style="position: absolute; top: 20px; right: 20px; background: white; border: 2px solid #e5e7eb; color: #000000; font-size: 1.75rem; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; box-shadow: 0 6px 16px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-weight: 800; transition: all 0.2s; z-index: 10;">✕</button>
                </div>
                <div class="recipe-modal-body">
                    <img src="${recipe.image}" alt="${recipe.title}" class="recipe-modal-image" onerror="this.src='https://via.placeholder.com/600x250?text=레시피+이미지'">
                    
                    <div class="recipe-section">
                        <div class="recipe-section-title">🎯 ${recipe.growth_benefit.title}</div>
                        <div class="recipe-section-content">${recipe.growth_benefit.description}</div>
                    </div>
                    
                    <div class="recipe-section">
                        <div class="recipe-section-title">🌟 주요 영양소</div>
                        <div class="recipe-card-nutrients">
                            ${recipe.key_nutrients.map(nutrient => 
                                `<span class="recipe-nutrient-tag">${nutrient}</span>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <div class="recipe-section">
                        <div class="recipe-section-title">🛒 재료</div>
                        <ul class="recipe-ingredients-list">
                            ${recipe.ingredients.map(ingredient => 
                                `<li>${ingredient}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    
                    <div class="recipe-section">
                        <div class="recipe-section-title">👨‍🍳 조리 순서</div>
                        <ol class="recipe-steps-list">
                            ${recipe.cooking_steps.map((step, index) => 
                                `<li data-step="${index + 1}">${step}</li>`
                            ).join('')}
                        </ol>
                    </div>
                    
                    ${recipe.tips ? `
                        <div class="recipe-section">
                            <div class="recipe-section-title">💡 조리 팁</div>
                            ${recipe.tips.map(tip => `
                                <div class="recipe-tip-box">
                                    <div class="recipe-tip-title">${tip.title}</div>
                                    <div class="recipe-tip-content">${tip.content}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${recipe.growth_science ? `
                        <div class="recipe-section">
                            <div class="recipe-section-title">🧬 ${recipe.growth_science.title}</div>
                            <div class="recipe-science-box">
                                <div class="recipe-science-content">${recipe.growth_science.content}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 모달 외부 클릭 시 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
    } catch (error) {
        console.error('❌ 레시피 상세 로드 실패:', error);
    }
}

// 사례 상세 모달 닫기
function closeCaseDetailModal() {
    document.getElementById('caseDetailModal').style.display = 'none';
}

// 만 나이 계산 (홈용)
function calculateAgeAtDate(birthDate, measureDate) {
    const measure = new Date(measureDate);
    const birth = new Date(birthDate);
    let years = measure.getFullYear() - birth.getFullYear();
    let months = measure.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && measure.getDate() < birth.getDate())) {
        years--;
        months += 12;
    }
    if (measure.getDate() < birth.getDate()) {
        months--;
    }
    return parseFloat((years + months / 12).toFixed(2));
}

// 홈 사례 차트 생성 (info.js와 동일)
let homeCaseChart = null;

function createHomeCaseChart(caseData) {
    console.log('📊 홈 사례 차트 생성 시작:', caseData.name);
    
    const canvas = document.getElementById('homeCaseChart');
    if (!canvas) {
        console.error('❌ 차트 캔버스를 찾을 수 없습니다: homeCaseChart');
        return;
    }
    
    console.log('✅ 캔버스 발견:', canvas);
    
    const ctx = canvas.getContext('2d');
    
    // 기존 차트 삭제
    if (homeCaseChart) {
        homeCaseChart.destroy();
        console.log('🗑️ 기존 차트 삭제');
    }
    
    // 환자 데이터 포인트
    const patientData = caseData.measurements.map(m => {
        const age = calculateAgeAtDate(caseData.birthDate, m.date);
        return { x: age, y: parseFloat(m.height) };
    });
    
    console.log('📊 환자 데이터:', patientData.length + '건');
    console.log('📊 첫 번째 데이터:', patientData[0]);
    
    // 표준 성장 곡선 데이터 생성 (5th, 50th, 95th)
    const standardData = getStandardGrowthDataFor5th95thHome(caseData.gender);
    
    console.log('📈 표준 데이터 개수:', standardData?.length);
    
    // 환자 데이터셋
    const patientDataset = {
        type: 'line',
        label: `${caseData.gender === 'male' ? '👦' : '👧'} ${caseData.name}의 성장 기록`,
        data: patientData,
        borderColor: '#dc2626',
        backgroundColor: '#dc2626',
        borderWidth: 4,
        pointRadius: 10,
        pointHoverRadius: 12,
        pointBackgroundColor: '#dc2626',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        tension: 0.3,
        fill: false,
        order: 0
    };
    
    // 데이터셋 구성
    const datasets = [patientDataset];
    
    // 표준 데이터가 있으면 추가
    if (standardData && standardData.length > 0) {
        datasets.push(...standardData);
    }
    
    console.log('📊 총 데이터셋 개수:', datasets.length);
    
    homeCaseChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
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
                        font: { size: 14, weight: 'bold' }
                    },
                    min: 2,
                    max: 18
                },
                y: {
                    title: {
                        display: true,
                        text: '키 (cm)',
                        font: { size: 14, weight: 'bold' }
                    },
                    min: 80,
                    max: 190,
                    ticks: {
                        stepSize: 10
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 10,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}cm (만 ${context.parsed.x.toFixed(1)}세)`;
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ 홈 사례 차트 생성 완료');
}

// 표준 성장 데이터 가져오기 (5th, 50th, 95th) - growth-data.js 사용
function getStandardGrowthDataFor5th95thHome(gender) {
    console.log('📈 표준 성장 데이터 가져오기 시작 - 성별:', gender);
    
    // heightPercentileData가 로드되었는지 확인
    if (typeof heightPercentileData === 'undefined') {
        console.error('❌ heightPercentileData가 로드되지 않았습니다');
        return [];
    }
    
    const percentiles = ['P5', 'P50', 'P95'];
    const colors = {
        'P5': '#93c5fd',
        'P50': '#3b82f6',
        'P95': '#1e40af'
    };
    const labels = {
        'P5': '5th 백분위',
        'P50': '50th 백분위',
        'P95': '95th 백분위'
    };
    
    const result = percentiles.map(p => ({
        label: labels[p],
        data: heightPercentileData[gender][p].map((height, index) => ({
            x: parseFloat(heightPercentileData.ages[index]),
            y: height
        })),
        borderColor: colors[p],
        backgroundColor: 'transparent',
        borderWidth: p === 'P50' ? 2.5 : 2,
        borderDash: p === 'P50' ? [3, 3] : [5, 5],
        pointRadius: 0,
        tension: 0.4,
        order: 100,
        fill: false
    }));
    
    console.log('✅ 표준 성장 데이터 생성 완료 - 곡선 개수:', result.length);
    
    return result;
}

// ==================== 아이 통계 ====================

async function loadChildStats() {
    const selectedChild = StorageManager.getSelectedChild();
    const container = document.getElementById('childStatsSlider');
    
    if (!selectedChild) {
        container.innerHTML = `
            <div class="stat-card" style="text-align: center;">
                <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 12px;">👶</div>
                <div style="color: #64748b;">아이를 선택해주세요</div>
            </div>
        `;
        return;
    }
    
    // 최근 성장 기록 가져오기
    const records = StorageManager.getGrowthRecords(selectedChild.id);
    
    if (!records || records.length === 0) {
        container.innerHTML = `
            <div class="stat-card" style="text-align: center;">
                <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 12px;">📊</div>
                <div style="color: #64748b; margin-bottom: 16px;">아직 성장 기록이 없습니다</div>
                <button class="btn btn-primary" onclick="location.href='growth.html'" style="padding: 10px 20px; font-size: 0.875rem;">
                    첫 기록 추가하기
                </button>
            </div>
        `;
        return;
    }
    
    // 최근 기록
    const latestRecord = records[records.length - 1];
    const height = latestRecord.height || 0;
    const weight = latestRecord.weight || 0;
    const recordDate = latestRecord.date || new Date().toISOString().split('T')[0];
    
    // 기록의 나이 사용 (기록 시점의 나이)
    const age = latestRecord.age || calculateAge(selectedChild.birthDate);
    const genderText = selectedChild.gender === 'male' ? '남아' : '여아';
    
    // 백분위 계산 (한국 표준 성장도표 사용)
    const heightPercentile = await calculatePercentile(height, age, selectedChild.gender, 'height');
    const weightPercentile = await calculatePercentile(weight, age, selectedChild.gender, 'weight');
    
    // 한국 표준 예측키 계산
    let predictedHeightHtml = '';
    if (age < 18) {
        try {
            if (!koreaGrowthStandard.isLoaded) {
                await koreaGrowthStandard.loadData();
            }
            const prediction = koreaGrowthStandard.predictAdultHeight(height, age, selectedChild.gender);
            if (prediction) {
                predictedHeightHtml = `
                    <div style="margin-top: 12px; padding: 12px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <div style="font-size: 0.75rem; color: #78350f; font-weight: 600;">🎯 예상 최종 키 (18세)</div>
                            <button onclick="showPredictionMethodModal('korea-standard')" style="background: rgba(120, 53, 15, 0.1); border: none; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.75rem; color: #78350f;">
                                ?
                            </button>
                        </div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #78350f;">
                            ${prediction.predictedHeight} cm
                        </div>
                        <div style="font-size: 0.7rem; color: #92400e; margin-top: 6px; opacity: 0.85;">
                            현재 백분위 ${heightPercentile.toFixed(1)}% 유지 시
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('예측키 계산 실패:', error);
        }
    }
    
    container.innerHTML = `
        <!-- 키 카드 -->
        <div class="stat-card">
            <div class="stat-card-header">
                <div class="stat-card-label">키 📏</div>
                <div class="stat-card-meta">
                    <div class="stat-card-meta-item">📅 ${recordDate}</div>
                    <div class="stat-card-meta-item">👦 ${selectedChild.name} · 만 ${age}세</div>
                </div>
            </div>
            
            ${createGaugeChart(height, 'cm', heightPercentile, 'height')}
            
            ${predictedHeightHtml}
            
            <button class="btn btn-primary" onclick="location.href='growth.html'" style="width: 100%; margin-top: 16px; padding: 12px;">
                성장 기록 입력하기
            </button>
        </div>
        
        <!-- 몸무게 카드 -->
        <div class="stat-card">
            <div class="stat-card-header">
                <div class="stat-card-label">체중 ⚖️</div>
                <div class="stat-card-meta">
                    <div class="stat-card-meta-item">📅 ${recordDate}</div>
                    <div class="stat-card-meta-item">👦 ${selectedChild.name} · 만 ${age}세</div>
                </div>
            </div>
            
            ${createGaugeChart(weight, 'kg', weightPercentile, 'weight')}
            
            <button class="btn btn-primary" onclick="location.href='challenge.html'" style="width: 100%; margin-top: 16px; padding: 12px;">
                챌린지 확인하기
            </button>
        </div>
    `;
}

// 게이지 차트 생성 (원형 스타일)
function createGaugeChart(value, unit, percentile, type) {
    // 게이지 각도 계산 (0-100% → 0-270도)
    const angle = (percentile / 100) * 270;
    
    // 색상 설정 (백분위에 따라)
    let strokeColor = '#22c55e'; // 기본 초록색
    if (percentile < 20) strokeColor = '#ef4444'; // 빨간색
    else if (percentile < 40) strokeColor = '#f97316'; // 주황색
    else if (percentile < 60) strokeColor = '#fbbf24'; // 노란색
    else if (percentile < 80) strokeColor = '#84cc16'; // 연두색
    
    const bgColor = '#e5e7eb';
    
    return `
        <div class="gauge-chart">
            <svg viewBox="0 0 180 180" style="transform: rotate(-135deg);">
                <!-- 배경 아크 -->
                <circle cx="90" cy="90" r="70" fill="none" stroke="${bgColor}" stroke-width="16" 
                    stroke-dasharray="330" stroke-dashoffset="82.5" stroke-linecap="round"/>
                <!-- 값 아크 -->
                <circle cx="90" cy="90" r="70" fill="none" stroke="${strokeColor}" stroke-width="16" 
                    stroke-dasharray="330" stroke-dashoffset="${82.5 + (330 * 0.75) * (1 - percentile / 100)}" 
                    stroke-linecap="round" style="transition: stroke-dashoffset 1s ease;"/>
            </svg>
            <div class="gauge-value">
                <div class="gauge-number">${value.toFixed(1)}</div>
                <div class="gauge-unit">${unit}</div>
            </div>
        </div>
    `;
}

// 백분위 계산 (한국 표준 성장도표 사용)
async function calculatePercentile(value, age, gender, type) {
    // 한국 표준 성장도표 로드 확인
    if (!koreaGrowthStandard.isLoaded) {
        try {
            await koreaGrowthStandard.loadData();
        } catch (error) {
            console.error('한국 표준 성장도표 로드 실패:', error);
            return 50; // 기본값
        }
    }
    
    // LMS 방법으로 정확한 백분위 계산
    return koreaGrowthStandard.calculatePercentile(value, age, gender, type);
}

// 아이 선택
function selectChild(childId) {
    StorageManager.setSelectedChild(childId);
    loadChildren();
}

// 아이 추가 모달 표시
function showAddChildModal() {
    document.getElementById('modalTitle').textContent = '아이 추가';
    document.getElementById('childForm').reset();
    document.getElementById('editChildId').value = '';
    document.getElementById('childBirthYear').value = '';
    document.getElementById('childBirthMonth').value = '';
    document.getElementById('childBirthDay').value = '';
    document.getElementById('childBirthDate').value = '';
    document.getElementById('childModal').style.display = 'flex';
}

// 아이 편집 모달 표시
function editChild(childId) {
    const children = StorageManager.getChildren();
    const child = children.find(c => c.id === childId);
    
    if (child) {
        document.getElementById('modalTitle').textContent = '아이 정보 수정';
        document.getElementById('childName').value = child.name;
        document.getElementById('childGender').value = child.gender;
        
        // 생년월일 파싱
        const birthDate = child.birthDate.split('-');
        if (birthDate.length === 3) {
            document.getElementById('childBirthYear').value = parseInt(birthDate[0]);
            document.getElementById('childBirthMonth').value = parseInt(birthDate[1]);
            document.getElementById('childBirthDay').value = parseInt(birthDate[2]);
            updateBirthDateFromInputs();
        }
        
        document.getElementById('editChildId').value = child.id;
        document.getElementById('childModal').style.display = 'flex';
    }
}

// 모달 닫기
function closeChildModal() {
    document.getElementById('childModal').style.display = 'none';
}

// 아이 저장
function saveChild(event) {
    event.preventDefault();
    
    const year = document.getElementById('childBirthYear').value;
    const month = document.getElementById('childBirthMonth').value;
    const day = document.getElementById('childBirthDay').value;
    const name = document.getElementById('childName').value;
    const gender = document.getElementById('childGender').value;
    
    // 유효성 검사
    if (!name || !gender) {
        alert('이름과 성별을 입력해주세요.');
        return;
    }
    
    if (!year || !month || !day) {
        alert('생년월일을 모두 입력해주세요.');
        return;
    }
    
    // 숫자로 변환
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    
    // 범위 검사
    if (yearNum < 2000 || yearNum > 2030) {
        alert('연도를 확인해주세요 (2000-2030).');
        return;
    }
    
    if (monthNum < 1 || monthNum > 12) {
        alert('월을 확인해주세요 (1-12).');
        return;
    }
    
    if (dayNum < 1 || dayNum > 31) {
        alert('일을 확인해주세요 (1-31).');
        return;
    }
    
    // 날짜 형식 생성
    const birthDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    
    // 날짜 유효성 검사
    const testDate = new Date(birthDate);
    if (isNaN(testDate.getTime())) {
        alert('올바른 날짜를 입력해주세요.');
        return;
    }
    
    const editId = document.getElementById('editChildId').value;
    const childData = {
        name: name.trim(),
        gender: gender,
        birthDate: birthDate
    };
    
    console.log('💾 저장할 아이 데이터:', childData);
    
    if (editId) {
        // 수정
        StorageManager.updateChild(editId, childData);
        console.log('✅ 아이 정보 수정 완료');
    } else {
        // 추가
        const newChild = StorageManager.addChild(childData);
        console.log('✅ 아이 추가 완료:', newChild);
    }
    
    closeChildModal();
    
    // 즉시 화면 갱신
    setTimeout(() => {
        loadChildren();
        loadChildStats();
        updateWelcomeMessage();
        
        // 저장 확인 로그
        const savedChildren = StorageManager.getChildren();
        console.log('📋 현재 저장된 아이 목록:', savedChildren);
    }, 100);
}

// 토스트 알림 표시
function showToast(message, duration = 3000) {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 새 토스트 생성
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 애니메이션
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 자동 제거
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

// 아이 삭제 확인
function confirmDeleteChild(childId, childName) {
    if (confirm(`⚠️ 정말로 "${childName}"의 정보를 삭제하시겠습니까?\n\n모든 성장 기록과 챌린지 데이터가 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.`)) {
        deleteChild(childId);
    }
}

// 아이 삭제
function deleteChild(childId) {
    const children = StorageManager.getChildren();
    const child = children.find(c => c.id === childId);
    
    if (child) {
        // 삭제 전 로그
        console.log('🗑️ 아이 삭제:', child.name);
        
        StorageManager.deleteChild(childId);
        
        // 화면 갱신
        loadChildren();
        loadChildStats();
        updateWelcomeMessage();
        
        // 삭제 완료 알림
        const message = `"${child.name}"의 정보가 삭제되었습니다.`;
        if (window.showToast) {
            showToast(message);
        } else {
            alert(message);
        }
    }
}

// ============ 예상키 예측 기능 ============

// 예상키 예측 모달 열기
function showHeightPredictionModal() {
    const children = StorageManager.getChildren();
    const select = document.getElementById('predictionChildSelect');
    
    if (children.length === 0) {
        alert('먼저 아이를 추가해주세요!');
        return;
    }
    
    // 아이 목록 채우기
    select.innerHTML = '<option value="">아이를 선택하세요</option>' + 
        children.map(child => {
            const genderIcon = child.gender === 'male' ? '👦' : '👧';
            return `<option value="${child.id}">${genderIcon} ${child.name}</option>`;
        }).join('');
    
    // 선택된 아이가 있으면 자동 선택
    const selectedChildId = StorageManager.getSelectedChildId();
    if (selectedChildId) {
        select.value = selectedChildId;
        loadChildCurrentData();
    }
    
    // 오늘 날짜를 디폴트로 설정
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('measurementDate').value = today;
    
    // 만 나이 계산
    updatePredictionAge();
    
    document.getElementById('heightPredictionModal').style.display = 'flex';
}

// 아이의 현재 데이터 로드 (최근 성장 기록)
function loadChildCurrentData() {
    const childId = document.getElementById('predictionChildSelect').value;
    if (!childId) return;
    
    // 해당 아이의 성장 기록 가져오기
    const allGrowthRecords = JSON.parse(localStorage.getItem('growthRecords') || '{}');
    const childGrowthRecords = allGrowthRecords[childId] || [];
    
    // 가장 최근 기록 사용
    if (childGrowthRecords.length > 0) {
        const latestRecord = childGrowthRecords[childGrowthRecords.length - 1];
        document.getElementById('childCurrentHeight').value = latestRecord.height;
        document.getElementById('childCurrentWeight').value = latestRecord.weight;
    } else {
        document.getElementById('childCurrentHeight').value = '';
        document.getElementById('childCurrentWeight').value = '';
    }
    
    // 만 나이 업데이트
    updatePredictionAge();
}

// 측정 날짜 기준 만 나이 계산 및 표시
function updatePredictionAge() {
    const childId = document.getElementById('predictionChildSelect').value;
    const measurementDate = document.getElementById('measurementDate').value;
    
    if (!childId || !measurementDate) {
        document.getElementById('calculatedAge').value = '';
        return;
    }
    
    const children = StorageManager.getChildren();
    const child = children.find(c => c.id === childId);
    
    if (!child) return;
    
    // 측정 날짜 기준 만 나이 계산
    const age = calculateAgeAtDate(child.birthDate, measurementDate);
    document.getElementById('calculatedAge').value = `만 ${age}세`;
}

// 특정 날짜 기준 만 나이 계산
function calculateAgeAtDate(birthDate, targetDate) {
    const birth = new Date(birthDate);
    const target = new Date(targetDate);
    
    let years = target.getFullYear() - birth.getFullYear();
    let months = target.getMonth() - birth.getMonth();
    let days = target.getDate() - birth.getDate();
    
    if (days < 0) {
        months--;
    }
    
    if (months < 0) {
        years--;
        months += 12;
    }
    
    const decimalAge = years + (months + days / 30) / 12;
    return parseFloat(decimalAge.toFixed(1));
}

// 예상키 예측 모달 닫기
function closeHeightPredictionModal() {
    document.getElementById('heightPredictionModal').style.display = 'none';
    document.getElementById('heightPredictionForm').reset();
}

// 예상키 계산 (Khamis-Roche + 한국 표준 성장도표 방법)
async function calculatePredictedHeight(event) {
    event.preventDefault();
    
    const childId = document.getElementById('predictionChildSelect').value;
    const measurementDate = document.getElementById('measurementDate').value;
    const fatherHeight = parseFloat(document.getElementById('fatherHeight').value);
    const motherHeight = parseFloat(document.getElementById('motherHeight').value);
    const currentHeight = parseFloat(document.getElementById('childCurrentHeight').value);
    const currentWeight = parseFloat(document.getElementById('childCurrentWeight').value);
    
    const children = StorageManager.getChildren();
    const child = children.find(c => c.id === childId);
    
    if (!child) {
        alert('아이를 선택해주세요!');
        return;
    }
    
    // 측정 날짜 기준 만 나이 계산
    const age = calculateAgeAtDate(child.birthDate, measurementDate);
    
    // 나이 범위 확인 (4-17세)
    if (age < 4 || age > 17) {
        alert('⚠️ 예측키 계산은 4-17세 아동에게 적용됩니다.\n측정 시점 나이: 만 ' + age + '세');
        return;
    }
    
    // 중간 부모 키 (Mid-Parent Height) 계산
    const midParentHeight = child.gender === 'male' 
        ? (fatherHeight + motherHeight + 13) / 2
        : (fatherHeight + motherHeight - 13) / 2;
    
    console.log('=== 예상키 예측 계산 ===');
    console.log('아이 정보:', child);
    console.log('아이 성별:', child.gender, child.gender === 'male' ? '남아' : '여아');
    console.log('아버지 키:', fatherHeight, 'cm');
    console.log('어머니 키:', motherHeight, 'cm');
    console.log('중간 부모 키:', midParentHeight, 'cm');
    
    // 1. Khamis-Roche 방법으로 예측
    const khamisRocheHeight = calculateKhamisRocheHeight(
        child.gender,
        age,
        currentHeight,
        currentWeight,
        midParentHeight
    );
    
    // 2. 한국 표준 성장도표 방법으로 예측
    let koreaStandardHeight = null;
    try {
        if (!koreaGrowthStandard.isLoaded) {
            await koreaGrowthStandard.loadData();
        }
        
        const prediction = koreaGrowthStandard.predictAdultHeight(currentHeight, age, child.gender);
        koreaStandardHeight = prediction.predictedHeight;
        
        console.log('한국 표준 성장도표 예측:', prediction);
    } catch (error) {
        console.error('한국 표준 성장도표 예측 실패:', error);
    }
    
    // 3. 두 방법의 평균 계산
    let finalPredictedHeight = khamisRocheHeight;
    let method = 'Khamis-Roche';
    
    if (koreaStandardHeight) {
        finalPredictedHeight = (khamisRocheHeight + koreaStandardHeight) / 2;
        method = 'Khamis-Roche + 한국 표준 성장도표';
        console.log('Khamis-Roche:', khamisRocheHeight, 'cm');
        console.log('한국 표준:', koreaStandardHeight, 'cm');
        console.log('평균:', finalPredictedHeight, 'cm');
    }
    
    console.log('=====================');
    
    // 예상 키 범위 (±5cm)
    const predictedMin = Math.round((finalPredictedHeight - 5) * 10) / 10;
    const predictedMax = Math.round((finalPredictedHeight + 5) * 10) / 10;
    const predictedAvg = Math.round(finalPredictedHeight * 10) / 10;
    
    // 결과 저장
    const predictionRecord = {
        id: 'pred-' + Date.now(),
        childId: child.id,
        childName: child.name,
        childGender: child.gender,
        measurementDate: measurementDate,
        age: age,
        fatherHeight: fatherHeight,
        motherHeight: motherHeight,
        currentHeight: currentHeight,
        currentWeight: currentWeight,
        midParentHeight: Math.round(midParentHeight * 10) / 10,
        predictedMin: predictedMin,
        predictedMax: predictedMax,
        predictedAvg: predictedAvg,
        khamisRocheHeight: Math.round(khamisRocheHeight * 10) / 10,
        koreaStandardHeight: koreaStandardHeight ? Math.round(koreaStandardHeight * 10) / 10 : null,
        method: method,
        createdAt: new Date().toISOString()
    };
    
    // localStorage에 저장
    let predictions = JSON.parse(localStorage.getItem('heightPredictions') || '[]');
    predictions.push(predictionRecord);
    localStorage.setItem('heightPredictions', JSON.stringify(predictions));
    
    // 모달 닫기
    closeHeightPredictionModal();
    
    // 결과 표시
    showPredictionResult(predictionRecord, child);
    
    // 기록 목록 새로고침
    loadPredictionRecords();
}

// Khamis-Roche 계산 로직
function calculateKhamisRocheHeight(gender, age, currentHeight, currentWeight, midParentHeight) {
    // Khamis-Roche 공식의 계수들 (나이와 성별에 따라 다름)
    // 실제 논문의 계수를 간소화한 버전
    
    let heightCoefficient, parentCoefficient, intercept;
    
    if (gender === 'male') {
        // 남아의 경우
        if (age >= 4 && age < 8) {
            heightCoefficient = 0.545;
            parentCoefficient = 0.544;
            intercept = 9.0;
        } else if (age >= 8 && age < 12) {
            heightCoefficient = 0.748;
            parentCoefficient = 0.376;
            intercept = 5.5;
        } else if (age >= 12 && age < 15) {
            heightCoefficient = 0.896;
            parentCoefficient = 0.187;
            intercept = 2.8;
        } else {
            // 15-17세
            heightCoefficient = 0.965;
            parentCoefficient = 0.071;
            intercept = 1.2;
        }
    } else {
        // 여아의 경우
        if (age >= 4 && age < 8) {
            heightCoefficient = 0.545;
            parentCoefficient = 0.544;
            intercept = 8.0;
        } else if (age >= 8 && age < 11) {
            heightCoefficient = 0.748;
            parentCoefficient = 0.376;
            intercept = 5.0;
        } else if (age >= 11 && age < 14) {
            heightCoefficient = 0.896;
            parentCoefficient = 0.187;
            intercept = 2.5;
        } else {
            // 14-17세
            heightCoefficient = 0.965;
            parentCoefficient = 0.071;
            intercept = 1.0;
        }
    }
    
    // 최종 예측 키 계산
    const predictedHeight = (heightCoefficient * currentHeight) + 
                           (parentCoefficient * midParentHeight) + 
                           intercept;
    
    return predictedHeight;
}

// 예측 결과 표시
function showPredictionResult(record, child) {
    const genderIcon = child.gender === 'male' ? '👦' : '👧';
    const genderText = child.gender === 'male' ? '남아' : '여아';
    
    // 두 방법의 결과를 모두 표시할지 결정
    const showBothMethods = record.koreaStandardHeight !== null;
    
    let resultHTML = `
        <div style="text-align: center; padding: 20px 0;">
            <div style="font-size: 3rem; margin-bottom: 12px;">${genderIcon}</div>
            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">${child.name}</h3>
            <p style="color: var(--text-light); font-size: 0.875rem; margin-bottom: 20px;">
                만 ${record.age}세 · ${genderText}
            </p>
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 4px;">${record.method}</div>
                <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 8px;">예상 최종 키 (18세)</div>
                <div style="font-size: 2rem; font-weight: 700; color: var(--primary-color); margin-bottom: 8px;">
                    ${record.predictedAvg}cm
                </div>
                <div style="font-size: 0.875rem; color: var(--text-color);">
                    범위: ${record.predictedMin}cm ~ ${record.predictedMax}cm
                </div>
            </div>
    `;
    
    // 두 방법을 모두 사용한 경우 상세 정보 표시
    if (showBothMethods) {
        resultHTML += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: #fef3c7; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 0.75rem; color: #78350f; margin-bottom: 4px;">Khamis-Roche</div>
                    <div style="font-size: 1.25rem; font-weight: 700; color: #78350f;">
                        ${record.khamisRocheHeight}cm
                    </div>
                </div>
                <div style="background: #dcfce7; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 0.75rem; color: #14532d; margin-bottom: 4px;">한국 표준</div>
                    <div style="font-size: 1.25rem; font-weight: 700; color: #14532d;">
                        ${record.koreaStandardHeight}cm
                    </div>
                </div>
            </div>
        `;
    }
    
    resultHTML += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: var(--bg-color); padding: 16px; border-radius: 12px;">
                    <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 4px;">현재 키</div>
                    <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-color);">
                        ${record.currentHeight}cm
                    </div>
                </div>
                <div style="background: var(--bg-color); padding: 16px; border-radius: 12px;">
                    <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 4px;">현재 몸무게</div>
                    <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-color);">
                        ${record.currentWeight}kg
                    </div>
                </div>
            </div>
            
            <div style="background: #fef3c7; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="font-size: 0.875rem; font-weight: 600; margin-bottom: 8px;">📊 성장 예측 분석</div>
                <div style="font-size: 0.875rem; line-height: 1.5; text-align: left;">
                    • 앞으로 약 <strong>${Math.round((record.predictedAvg - record.currentHeight) * 10) / 10}cm</strong> 성장 예상<br>
                    • 중간 부모 키: <strong>${record.midParentHeight}cm</strong><br>
                    &nbsp;&nbsp;(${genderText === '남아' ? '아빠+엄마+13' : '아빠+엄마-13'}) ÷ 2<br>
                    • 아버지: ${record.fatherHeight}cm / 어머니: ${record.motherHeight}cm
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="font-size: 0.875rem; font-weight: 600; margin-bottom: 8px;">⚠️ 중요 안내</div>
                <div style="font-size: 0.75rem; color: var(--text-color); line-height: 1.6; text-align: left;">
                    ${showBothMethods ? 
                        'Khamis-Roche 방법과 한국 표준 성장도표를 결합하여<br>더욱 정확한 예측을 제공합니다.<br><br>' : 
                        'Khamis-Roche 방법은 <strong>4-17세 아동</strong>을 대상으로 하며,<br>현재 키, 체중, 부모 키를 종합하여 예측합니다.<br><br>'
                    }
                    실제 최종 키는 <strong>영양, 운동, 수면, 스트레스</strong> 등<br>
                    환경적 요인에 따라 달라질 수 있습니다.<br><br>
                    예측 오차: ±5cm (95% 신뢰구간)
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('predictionResult').innerHTML = resultHTML;
    document.getElementById('predictionResultModal').style.display = 'flex';
}

// 예측 결과 모달 닫기
function closePredictionResultModal() {
    document.getElementById('predictionResultModal').style.display = 'none';
}

// 예측 기록 목록 로드
function loadPredictionRecords() {
    const predictions = JSON.parse(localStorage.getItem('heightPredictions') || '[]');
    const container = document.getElementById('predictionRecordsList');
    const card = document.getElementById('predictionRecordsCard');
    
    if (predictions.length === 0) {
        card.style.display = 'none';
        return;
    }
    
    card.style.display = 'block';
    
    // 최근 기록부터 표시
    const sortedPredictions = predictions.slice().reverse();
    
    container.innerHTML = sortedPredictions.map(record => {
        const genderIcon = record.childGender === 'male' ? '👦' : '👧';
        const displayDate = record.measurementDate || record.date || '';
        
        return `
            <div class="prediction-record-item">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <div class="touchable" onclick="showPredictionChart('${record.id}')" style="display: flex; align-items: center; gap: 12px; flex: 1;">
                        <div style="font-size: 1.5rem;">${genderIcon}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; font-size: 1rem;">${record.childName}</div>
                            <div style="font-size: 0.75rem; color: var(--text-light);">
                                ${displayDate} · 만 ${record.age}세
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.75rem; color: var(--text-light);">예상키</div>
                        <div style="font-weight: 700; color: var(--primary-color); font-size: 1.125rem;">
                            ${record.predictedAvg}cm
                        </div>
                    </div>
                    <button class="btn-icon" onclick="event.stopPropagation(); deletePrediction('${record.id}')" title="삭제" style="flex-shrink: 0;">
                        🗑️
                    </button>
                </div>
                <div class="touchable" onclick="showPredictionChart('${record.id}')" style="background: var(--bg-color); padding: 8px; border-radius: 8px; font-size: 0.75rem; color: var(--text-light);">
                    범위: ${record.predictedMin}cm ~ ${record.predictedMax}cm
                </div>
            </div>
        `;
    }).join('');
}

// 예측 기록 삭제
function deletePrediction(predictionId) {
    if (!confirm('이 예측 기록을 삭제하시겠습니까?')) {
        return;
    }
    
    let predictions = JSON.parse(localStorage.getItem('heightPredictions') || '[]');
    predictions = predictions.filter(p => p.id !== predictionId);
    localStorage.setItem('heightPredictions', JSON.stringify(predictions));
    
    loadPredictionRecords();
}

// 예측 기록 클릭 시 차트 표시
function showPredictionChart(predictionId) {
    const predictions = JSON.parse(localStorage.getItem('heightPredictions') || '[]');
    const prediction = predictions.find(p => p.id === predictionId);
    
    if (!prediction) return;
    
    // 해당 아이의 성장 기록 가져오기
    const allGrowthRecords = JSON.parse(localStorage.getItem('growthRecords') || '{}');
    const childGrowthRecords = allGrowthRecords[prediction.childId] || [];
    
    console.log('예측 ID:', predictionId);
    console.log('예측 정보:', prediction);
    console.log('전체 성장 기록:', allGrowthRecords);
    console.log('아이 ID:', prediction.childId);
    console.log('해당 아이 성장 기록:', childGrowthRecords);
    
    // 모달 제목 설정
    const genderIcon = prediction.childGender === 'male' ? '👦' : '👧';
    document.getElementById('chartModalTitle').textContent = 
        `${genderIcon} ${prediction.childName}의 성장 그래프`;
    
    // 예측 정보 표시
    const displayDate = prediction.measurementDate || prediction.date || '';
    const recordCount = childGrowthRecords.length;
    
    document.getElementById('chartPredictionInfo').innerHTML = `
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-around; text-align: center;">
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 4px;">측정일</div>
                    <div style="font-weight: 700;">${displayDate}</div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 4px;">측정 나이</div>
                    <div style="font-weight: 700;">만 ${prediction.age}세</div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 4px;">예상 최종 키</div>
                    <div style="font-weight: 700; color: var(--primary-color); font-size: 1.125rem;">
                        ${prediction.predictedAvg}cm
                    </div>
                </div>
            </div>
            ${recordCount === 0 ? `
            <div style="margin-top: 12px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; text-align: center; color: #dc2626;">
                <strong>⚠️ 성장 기록 없음</strong><br>
                <span style="font-size: 0.875rem;">성장 기록을 추가하면 그래프에 실제 성장 포인트가 표시됩니다.</span>
            </div>
            ` : `
            <div style="margin-top: 12px; text-align: center; color: var(--text-light); font-size: 0.875rem;">
                📊 총 ${recordCount}개의 성장 기록
            </div>
            `}
        </div>
    `;
    
    // 차트 생성
    createHomeGrowthChart(prediction, childGrowthRecords);
    
    // 모달 표시
    document.getElementById('growthChartModal').style.display = 'flex';
}

// 홈 화면 성장 차트 생성
async function createHomeGrowthChart(prediction, growthRecords) {
    const canvas = document.getElementById('homeGrowthChart');
    const ctx = canvas.getContext('2d');
    
    // 기존 차트 파괴
    if (homeGrowthChart) {
        homeGrowthChart.destroy();
    }
    
    // 성장 기록 데이터 준비 - age가 있는지 확인하고 없으면 계산
    const patientData = childGrowthRecords
        .filter(record => record && record.height) // 유효한 데이터만 필터링
        .map(record => {
            let age = record.age;
            
            // age가 없으면 생년월일과 측정일로 계산
            if (!age && record.birthDate && record.date) {
                age = calculateAgeAtDate(record.birthDate, record.date);
            }
            
            // age가 문자열인 경우 파싱
            if (typeof age === 'string') {
                age = parseFloat(age);
            }
            
            const height = parseFloat(record.height);
            
            console.log('Record:', record, 'Age:', age, 'Height:', height);
            
            return {
                x: age || 0,
                y: height || 0
            };
        })
        .filter(point => point.x > 0 && point.y > 0); // 유효한 포인트만
    
    console.log('Patient data for chart:', patientData); // 디버깅용
    console.log('Number of valid points:', patientData.length);
    
    // 예측 키 포인트 추가 (18세 기준)
    const predictionPoint = {
        x: 18,
        y: prediction.predictedAvg
    };
    
    // 표준 성장 곡선 데이터 (한국 표준 성장도표)
    const standardData = await getStandardGrowthData(prediction.childGender);
    
    homeGrowthChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                ...standardData,
                {
                    label: '실제 성장 기록',
                    data: patientData,
                    borderColor: '#ef4444',
                    backgroundColor: '#ef4444',
                    borderWidth: 3,
                    pointRadius: 8,  // 더 크게
                    pointHoverRadius: 10,  // 호버 시 더 크게
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,  // 테두리 두껍게
                    tension: 0.4,
                    fill: false,
                    order: 1  // 표준 곡선보다 위에 그리기
                },
                {
                    label: '예상 최종 키',
                    data: [predictionPoint],
                    borderColor: '#f59e0b',
                    backgroundColor: '#f59e0b',
                    pointRadius: 10,
                    pointHoverRadius: 12,
                    pointStyle: 'star',
                    pointBorderWidth: 2,
                    pointBorderColor: '#fff',
                    showLine: false,
                    order: 0  // 가장 위에 그리기
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
                    mode: 'nearest',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1) + 'cm';
                            }
                            if (context.parsed.x !== null) {
                                label += ' (만 ' + context.parsed.x.toFixed(1) + '세)';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// 표준 성장 데이터 가져오기 (한국 표준 성장도표 2017)
async function getStandardGrowthData(gender) {
    // 한국 표준 성장도표 로드 확인
    if (!koreaGrowthStandard.isLoaded) {
        try {
            await koreaGrowthStandard.loadData();
        } catch (error) {
            console.error('한국 표준 성장도표 로드 실패:', error);
            // 기본 데이터로 폴백
            return getDefaultStandardGrowthData(gender);
        }
    }
    
    // 한국 표준 성장도표에서 곡선 데이터 생성
    const curves = koreaGrowthStandard.generateGrowthCurves(gender, 'height', 2, 18);
    
    if (!curves) {
        return getDefaultStandardGrowthData(gender);
    }
    
    const colors = {
        'p5': '#93c5fd',
        'p50': '#3b82f6',
        'p95': '#1e40af'
    };
    
    const labels = {
        'p5': 'P5 (하위 5%)',
        'p50': 'P50 (평균)',
        'p95': 'P95 (상위 5%)'
    };
    
    return ['p5', 'p50', 'p95'].map(p => ({
        label: labels[p],
        data: curves[p].map(point => ({
            x: point.age,
            y: point.value
        })),
        borderColor: colors[p],
        backgroundColor: 'transparent',
        borderWidth: p === 'p50' ? 3 : 2,
        borderDash: p === 'p50' ? [] : [5, 5],
        pointRadius: 0,
        tension: 0.4,
        fill: false,
        order: 2  // 실제 성장 기록보다 뒤에 그리기
    }));
}

// 기본 표준 성장 데이터 (폴백용)
function getDefaultStandardGrowthData(gender) {
    const percentiles = ['P5', 'P50', 'P95'];
    const colors = {
        'P5': '#93c5fd',
        'P50': '#3b82f6',
        'P95': '#1e40af'
    };
    
    // heightPercentileData가 있으면 사용
    if (typeof heightPercentileData !== 'undefined' && heightPercentileData[gender]) {
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
            fill: false,
            order: 2
        }));
    }
    
    // 그것도 없으면 빈 배열 반환
    return [];
}

// 성장 그래프 모달 닫기
function closeGrowthChartModal() {
    document.getElementById('growthChartModal').style.display = 'none';
    if (homeGrowthChart) {
        homeGrowthChart.destroy();
        homeGrowthChart = null;
    }
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
                
                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 12px;">
                        💡 LMS 방법이란?
                    </h4>
                    <div style="background: #fef3c7; padding: 16px; border-radius: 12px;">
                        <div style="font-size: 0.875rem; color: #78350f; line-height: 1.6;">
                            <strong>L</strong>ambda-<strong>M</strong>u-<strong>S</strong>igma 방법은 WHO, CDC, 대한소아과학회가 공식 채택한 국제 표준 성장 분석 방법입니다.<br><br>
                            • <strong>L (Lambda)</strong>: 왜도 보정 계수<br>
                            • <strong>M (Mu)</strong>: 중앙값 (50%)<br>
                            • <strong>S (Sigma)</strong>: 변동계수<br><br>
                            이 세 값으로 모든 백분위(1st~99th)를 정확하게 계산할 수 있습니다.
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 12px;">
                        ✅ 장점
                    </h4>
                    <ul style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                        <li>한국 아동(2005-2016년 데이터)에 최적화</li>
                        <li>수학적으로 정확한 백분위 계산</li>
                        <li>성장 패턴의 일관성 반영</li>
                    </ul>
                </div>
                
                <div style="background: #fee2e2; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 0.875rem; font-weight: 600; color: #991b1b; margin-bottom: 8px;">
                        ⚠️ 참고사항
                    </div>
                    <div style="font-size: 0.875rem; color: #991b1b; line-height: 1.6;">
                        • 이 방법은 현재 성장 추세가 유지된다는 가정 하에 예측합니다.<br>
                        • 실제 최종 키는 영양, 운동, 수면, 스트레스, 질병 등 환경적 요인에 따라 달라질 수 있습니다.<br>
                        • 정확한 진단과 상담은 전문의와 함께하세요.
                    </div>
                </div>
            </div>
        `;
    } else if (method === 'khamis-roche') {
        html = `
            <div style="padding: 20px;">
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                    <div style="font-size: 1.125rem; font-weight: 700; color: #78350f; margin-bottom: 8px;">
                        👨‍👩‍👧‍👦 Khamis-Roche 방법
                    </div>
                    <div style="font-size: 0.875rem; color: #92400e; line-height: 1.6;">
                        부모의 키와 아이의 현재 키·체중을 종합하여 최종 키를 예측하는 방법입니다.
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 12px;">
                        🔬 산출 근거
                    </h4>
                    <div style="background: #f9fafb; padding: 16px; border-radius: 12px; border-left: 4px solid #f59e0b;">
                        <ol style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                            <li><strong>중간 부모 키 계산</strong><br>
                                남아: (아빠키 + 엄마키 + 13) ÷ 2<br>
                                여아: (아빠키 + 엄마키 - 13) ÷ 2</li>
                            <li style="margin-top: 12px;"><strong>예측 공식 적용</strong><br>
                                예측키 = (현재키 × 계수₁) + (중간부모키 × 계수₂) + 상수<br>
                                <span style="font-size: 0.8rem; color: #6b7280;">* 계수는 나이와 성별에 따라 다름</span></li>
                            <li style="margin-top: 12px;"><strong>예측 범위</strong><br>
                                예측키 ±5cm (95% 신뢰구간)</li>
                        </ol>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 12px;">
                        ✅ 장점
                    </h4>
                    <ul style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                        <li>유전적 요인(부모 키) 반영</li>
                        <li>현재 성장 상태 고려</li>
                        <li>임상에서 널리 사용되는 검증된 방법</li>
                        <li>4-17세 아동에게 적용 가능</li>
                    </ul>
                </div>
                
                <div style="background: #fee2e2; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 0.875rem; font-weight: 600; color: #991b1b; margin-bottom: 8px;">
                        ⚠️ 참고사항
                    </div>
                    <div style="font-size: 0.875rem; color: #991b1b; line-height: 1.6;">
                        • 부모 키 정보가 정확해야 예측도 정확합니다.<br>
                        • 4-17세 아동에게만 적용 가능합니다.<br>
                        • 예측 오차 범위: ±5cm (95% 신뢰구간)<br>
                        • 환경적 요인에 따라 실제 키는 달라질 수 있습니다.
                    </div>
                </div>
            </div>
        `;
    } else if (method === 'combined') {
        html = `
            <div style="padding: 20px;">
                <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                    <div style="font-size: 1.125rem; font-weight: 700; color: #14532d; margin-bottom: 8px;">
                        🎯 통합 예측 방법
                    </div>
                    <div style="font-size: 0.875rem; color: #15803d; line-height: 1.6;">
                        Khamis-Roche와 한국 표준 성장도표 두 가지 방법을 결합하여 더욱 정확한 예측을 제공합니다.
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 12px;">
                        🔬 산출 근거
                    </h4>
                    <div style="background: #f9fafb; padding: 16px; border-radius: 12px; border-left: 4px solid #10b981;">
                        <div style="color: #4b5563; line-height: 1.8;">
                            <strong>1. Khamis-Roche 방법으로 예측</strong><br>
                            부모 키와 현재 성장 상태를 고려한 예측<br><br>
                            
                            <strong>2. 한국 표준 성장도표 방법으로 예측</strong><br>
                            현재 백분위를 18세까지 투영한 예측<br><br>
                            
                            <strong>3. 두 예측의 평균 계산</strong><br>
                            최종 예측키 = (Khamis-Roche + 한국 표준) ÷ 2
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 1rem; font-weight: 700; color: #1f2937; margin-bottom: 12px;">
                        ✅ 장점
                    </h4>
                    <ul style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                        <li><strong>두 방법의 장점 결합</strong><br>
                            유전적 요인 + 성장 패턴 모두 고려</li>
                        <li style="margin-top: 8px;"><strong>더 높은 신뢰도</strong><br>
                            한쪽 방법의 편차를 다른 방법이 보완</li>
                        <li style="margin-top: 8px;"><strong>한국 아동 최적화</strong><br>
                            한국 표준 데이터로 정확도 향상</li>
                    </ul>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                    <button onclick="showPredictionMethodModal('khamis-roche')" style="padding: 12px; background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; cursor: pointer; text-align: left;">
                        <div style="font-size: 0.875rem; font-weight: 600; color: #78350f; margin-bottom: 4px;">
                            Khamis-Roche
                        </div>
                        <div style="font-size: 0.75rem; color: #92400e;">
                            자세히 보기 →
                        </div>
                    </button>
                    <button onclick="showPredictionMethodModal('korea-standard')" style="padding: 12px; background: #dbeafe; border: 2px solid #3b82f6; border-radius: 12px; cursor: pointer; text-align: left;">
                        <div style="font-size: 0.875rem; font-weight: 600; color: #1e40af; margin-bottom: 4px;">
                            한국 표준
                        </div>
                        <div style="font-size: 0.75rem; color: #1e3a8a;">
                            자세히 보기 →
                        </div>
                    </button>
                </div>
                
                <div style="background: #fee2e2; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 0.875rem; font-weight: 600; color: #991b1b; margin-bottom: 8px;">
                        ⚠️ 참고사항
                    </div>
                    <div style="font-size: 0.875rem; color: #991b1b; line-height: 1.6;">
                        • 두 방법 모두 현재 성장 추세가 유지된다는 가정 하에 예측합니다.<br>
                        • 실제 최종 키는 영양, 운동, 수면, 질병 등 환경적 요인에 따라 달라질 수 있습니다.<br>
                        • 정확한 진단과 상담은 전문의와 함께하세요.
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
