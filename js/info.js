// ===== 정보 페이지 스크립트 =====

// 전역 변수에 차트 추가
let growthGuideData = null;
let recipeData = null;
let casesData = null;
let faqData = null;
let currentCategory = 'all';
let caseChart = null; // Chart.js 인스턴스

// 페이지 로드
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📚 정보 페이지 로드 시작');
    
    await loadData();
    renderCategoryButtons();
    renderGuideCards();
    renderRecipeCards();
    renderCases();
    renderFAQ();
    setupEventListeners();
    
    // URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    
    // ?tab=cases이면 치료 사례 탭으로 전환
    if (urlParams.get('tab') === 'cases') {
        const casesTab = document.querySelector('[data-tab="cases"]');
        if (casesTab) {
            setTimeout(() => {
                casesTab.click();
            }, 100);
        }
    }
    
    // auto=true이면 sessionStorage의 사례 자동 열기
    if (urlParams.get('auto') === 'true') {
        const selectedCaseData = sessionStorage.getItem('selectedCase');
        if (selectedCaseData) {
            try {
                const caseInfo = JSON.parse(selectedCaseData);
                console.log('🔍 자동 열기 요청:', caseInfo);
                
                // casesData에서 매칭되는 사례 찾기
                const caseIndex = casesData.findIndex(c => 
                    c.name === caseInfo.name && c.birthDate === caseInfo.birthDate
                );
                
                if (caseIndex !== -1) {
                    console.log('✅ 사례 찾음, 모달 열기:', caseIndex);
                    
                    // 치료 사례 탭으로 전환
                    const casesTab = document.querySelector('[data-tab="cases"]');
                    if (casesTab) {
                        casesTab.click();
                    }
                    
                    // 약간의 딜레이 후 모달 열기
                    setTimeout(() => {
                        showCaseDetail(casesData[caseIndex]);
                    }, 300);
                }
                
                // sessionStorage 정리
                sessionStorage.removeItem('selectedCase');
                
                // URL 파라미터 제거
                window.history.replaceState({}, document.title, window.location.pathname + '?tab=cases');
            } catch (error) {
                console.error('❌ 자동 모달 열기 실패:', error);
            }
        }
    }
});

// 데이터 로드
async function loadData() {
    try {
        // 성장 가이드 데이터 로드
        const guideResponse = await fetch('data/growth_guide.json');
        growthGuideData = await guideResponse.json();
        console.log('✅ 성장 가이드 데이터 로드:', growthGuideData.cards.length + '개');

        // 레시피 데이터 로드
        const recipeResponse = await fetch('data/recipes.json');
        recipeData = await recipeResponse.json();
        console.log('✅ 레시피 데이터 로드:', recipeData.recipes.length + '개');

        // 사례 데이터 로드
        const casesResponse = await fetch('data/cases.json');
        casesData = await casesResponse.json();
        console.log('✅ 사례 데이터 로드:', casesData.length + '개');

        // FAQ 데이터 로드 (항상 최신 파일 사용)
        try {
            const faqResponse = await fetch('data/faqs.json');
            const faqJson = await faqResponse.json();
            // 새로운 FAQ 구조 처리
            faqData = faqJson.faq_section ? faqJson.faq_section.questions : faqJson;
            console.log('✅ FAQ 데이터 로드 (파일):', faqData.length + '개');
        } catch (error) {
            console.warn('⚠️ FAQ 파일 없음, localStorage 확인');
            // 파일 로드 실패 시 localStorage 확인
            const storedFaqs = localStorage.getItem('adminFaqs');
            if (storedFaqs) {
                const parsed = JSON.parse(storedFaqs);
                faqData = Array.isArray(parsed) ? parsed : (parsed.faq_section ? parsed.faq_section.questions : []);
                console.log('✅ FAQ 데이터 로드 (localStorage):', faqData.length + '개');
            } else {
                faqData = getDefaultFAQs();
            }
        }
    } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

// 카테고리 버튼 렌더링
function renderCategoryButtons() {
    const filterContainer = document.querySelector('.category-filter');
    
    // 전체 버튼
    let html = `
        <button class="category-btn active" data-category="all">
            전체 <span style="font-size: 11px; opacity: 0.7;">(${growthGuideData.cards.length})</span>
        </button>
    `;

    // 카테고리별 버튼
    growthGuideData.categories.forEach(cat => {
        const count = growthGuideData.cards.filter(c => c.category === cat.id).length;
        html += `
            <button class="category-btn" data-category="${cat.id}">
                ${cat.icon} ${cat.name} <span style="font-size: 11px; opacity: 0.7;">(${count})</span>
            </button>
        `;
    });

    filterContainer.innerHTML = html;

    // 카테고리 버튼 클릭 이벤트
    filterContainer.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            currentCategory = category;

            // 활성 상태 변경
            filterContainer.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 카드 다시 렌더링
            renderGuideCards();
        });
    });
}

// 성장 가이드 카드 렌더링
function renderGuideCards() {
    const container = document.getElementById('guideCards');
    
    // 현재 카테고리에 맞는 카드 필터링
    let cards = growthGuideData.cards;
    if (currentCategory !== 'all') {
        cards = cards.filter(c => c.category === currentCategory);
    }

    // 순서대로 정렬
    cards.sort((a, b) => a.order - b.order);

    // HTML 생성
    const html = cards.map(card => `
        <div class="guide-card" data-card-id="${card.id}">
            <span class="guide-card-icon">${card.icon}</span>
            <h3 class="guide-card-title">${card.title}</h3>
            <p class="guide-card-subtitle">${card.subtitle}</p>
            <div class="guide-card-time">⏱️ ${card.reading_time}</div>
            <div class="guide-card-tags">
                ${card.tags.slice(0, 2).map(tag => 
                    `<span class="guide-card-tag">#${tag}</span>`
                ).join('')}
            </div>
        </div>
    `).join('');

    container.innerHTML = html;

    // 카드 클릭 이벤트
    container.querySelectorAll('.guide-card').forEach(cardEl => {
        cardEl.addEventListener('click', () => {
            const cardId = cardEl.dataset.cardId;
            const card = growthGuideData.cards.find(c => c.id === cardId);
            showCardDetail(card);
        });
    });

    console.log('✅ 카드 렌더링 완료:', cards.length + '개');
}

// 카드 상세 모달 표시
function showCardDetail(card) {
    const modal = document.getElementById('cardDetailModal');
    const modalBody = document.getElementById('modalBody');

    // 모달 내용 생성
    let html = `
        <div class="modal-header">
            <div class="modal-icon">${card.icon}</div>
            <h2 class="modal-title">${card.title}</h2>
            <p class="modal-subtitle">${card.subtitle}</p>
        </div>

        ${card.thumbnail ? `
            <div class="modal-thumbnail">
                <img src="${card.thumbnail}" alt="${card.thumbnail_alt || card.title}" />
            </div>
        ` : ''}

        <div class="modal-meta">
            <div class="modal-meta-item">
                ⏱️ ${card.reading_time}
            </div>
            <div class="modal-meta-item">
                📚 ${getCategoryName(card.category)}
            </div>
        </div>

        <div class="modal-summary">
            <p>${card.summary}</p>
        </div>

        <div class="modal-key-points">
            <h3>✨ 핵심 포인트</h3>
            <ul>
                ${card.key_points.map(point => `<li>${point}</li>`).join('')}
            </ul>
        </div>
    `;

    // 상세 내용 추가
    if (card.detail && card.detail.sections) {
        card.detail.sections.forEach(section => {
            html += renderDetailSection(section);
        });
    }

    // CTA 버튼
    if (card.cta) {
        html += `
            <div class="modal-cta">
                <p style="margin: 0 0 12px 0; font-size: 14px;">지금 바로 시작하세요!</p>
                <a href="#" class="modal-cta-button" onclick="handleCTA('${card.cta}'); return false;">
                    ${getCtaText(card.cta)}
                </a>
            </div>
        `;
    }

    modalBody.innerHTML = html;
    modal.classList.add('active');
}

// 상세 섹션 렌더링
function renderDetailSection(section) {
    let html = '<div class="modal-detail-section">';

    switch (section.type) {
        case 'intro':
        case 'explanation':
            html += section.title ? `<h4>${section.title}</h4>` : '';
            html += `<p>${section.content}</p>`;
            break;

        case 'guide':
            html += `<h4>${section.title}</h4>`;
            html += '<ol style="margin: 0; padding-left: 20px;">';
            section.steps.forEach(step => {
                html += `<li style="margin-bottom: 8px; font-size: 14px; color: #666;">${step}</li>`;
            });
            html += '</ol>';
            break;

        case 'checklist':
            html += `<h4>${section.title}</h4>`;
            html += '<ul style="margin: 0; padding-left: 20px;">';
            section.items.forEach(item => {
                html += `<li style="margin-bottom: 8px; font-size: 14px; color: #666;">✅ ${item}</li>`;
            });
            html += '</ul>';
            break;

        case 'stages':
            html += `<h4>${section.title}</h4>`;
            section.stages.forEach((stage, index) => {
                html += `
                    <div style="margin-bottom: 16px; padding: 12px; background: white; border-radius: 8px;">
                        <strong style="color: #667eea;">${stage.name}</strong>
                        <p style="margin: 8px 0; font-size: 13px; color: #666;">${stage.description}</p>
                        <div style="font-size: 12px; color: #999;">
                            ${stage.key_actions.map(action => `• ${action}`).join('<br>')}
                        </div>
                    </div>
                `;
            });
            break;

        case 'methods':
            html += `<h4>${section.title}</h4>`;
            section.methods.forEach(method => {
                html += `
                    <div style="margin-bottom: 12px; padding: 12px; background: white; border-radius: 8px;">
                        <strong style="color: #333;">${method.name}</strong>
                        <p style="margin: 4px 0; font-size: 13px; color: #666; white-space: pre-line;">${method.description}</p>
                        <div style="font-size: 12px; color: #667eea; margin-top: 4px;">${method.accuracy}</div>
                    </div>
                `;
            });
            break;

        case 'breakdown':
            html += `<h4>${section.title}</h4>`;
            section.factors.forEach(factor => {
                html += `
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <strong style="font-size: 14px;">${factor.name}</strong>
                            <span style="font-size: 14px; color: #667eea; font-weight: 600;">${factor.percentage}%</span>
                        </div>
                        <div style="height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${factor.percentage}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                        </div>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #999;">${factor.description}</p>
                    </div>
                `;
            });
            break;

        case 'nutrients':
            html += `<h4>${section.title}</h4>`;
            section.nutrients.forEach((nutrient, index) => {
                html += `
                    <div style="margin-bottom: 16px; padding: 12px; background: white; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <strong style="color: #667eea; font-size: 15px;">${index + 1}. ${nutrient.name}</strong>
                            <span style="font-size: 12px; color: #999; white-space: nowrap; margin-left: 8px;">${nutrient.daily_amount}</span>
                        </div>
                        <p style="margin: 4px 0; font-size: 13px; color: #666;">${nutrient.role}</p>
                        <div style="font-size: 12px; color: #999; margin-top: 4px;">
                            ${nutrient.sources.join(' · ')}
                        </div>
                    </div>
                `;
            });
            break;

        case 'pyramid':
            html += `<h4>${section.title}</h4>`;
            section.levels.forEach(level => {
                html += `
                    <div style="margin-bottom: 12px; padding: 12px; background: white; border-radius: 8px; border-left: 4px solid #667eea;">
                        <strong style="color: #333;">${level.level}</strong>
                        <p style="margin: 4px 0; font-size: 13px; color: #666;">${level.foods}</p>
                        <div style="font-size: 12px; color: #999;">
                            양: ${level.amount} | 빈도: ${level.frequency}
                        </div>
                    </div>
                `;
            });
            break;

        case 'sleep_guide':
            html += `<h4>${section.title}</h4>`;
            section.age_groups.forEach(group => {
                html += `
                    <div style="margin-bottom: 8px; padding: 10px; background: white; border-radius: 8px; display: flex; justify-content: space-between;">
                        <span style="font-size: 13px; color: #666;">${group.age}</span>
                        <strong style="font-size: 13px; color: #667eea;">${group.hours}</strong>
                    </div>
                `;
            });
            break;

        case 'exercises':
            html += `<h4>${section.title}</h4>`;
            section.exercises.forEach(exercise => {
                html += `
                    <div style="margin-bottom: 16px; padding: 12px; background: white; border-radius: 8px;">
                        <strong style="color: #667eea;">${exercise.name}</strong>
                        <p style="margin: 4px 0; font-size: 13px; color: #666;">${exercise.benefits}</p>
                        <div style="font-size: 12px; color: #999; margin-top: 4px;">
                            ${exercise.frequency} · ${exercise.duration}
                        </div>
                        <div style="font-size: 12px; color: #f97316; margin-top: 4px;">💡 ${exercise.tips}</div>
                    </div>
                `;
            });
            break;

        case 'conversation_guide':
            html += `<h4>${section.title}</h4>`;
            section.principles.forEach(principle => {
                html += `
                    <div style="margin-bottom: 16px; padding: 12px; background: white; border-radius: 8px;">
                        <strong style="color: #667eea;">${principle.title}</strong>
                        <div style="margin-top: 8px; padding: 8px; background: #fff5f5; border-radius: 6px; border-left: 3px solid #f97316;">
                            <div style="font-size: 12px; color: #999; margin-bottom: 4px;">❌ 이렇게 말하지 마세요</div>
                            <div style="font-size: 13px; color: #666;">"${principle.bad}"</div>
                        </div>
                        <div style="margin-top: 8px; padding: 8px; background: #f0fff4; border-radius: 6px; border-left: 3px solid #10b981;">
                            <div style="font-size: 12px; color: #999; margin-bottom: 4px;">✅ 이렇게 말해보세요</div>
                            <div style="font-size: 13px; color: #666;">"${principle.good}"</div>
                        </div>
                    </div>
                `;
            });
            break;

        default:
            // 기타 섹션은 기본 텍스트로 표시
            if (section.content) {
                html += `<p>${section.content}</p>`;
            }
    }

    html += '</div>';
    return html;
}

// 레시피 카드 렌더링
function renderRecipeCards() {
    const container = document.getElementById('recipeCards');
    
    if (!recipeData || !recipeData.recipes || recipeData.recipes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">레시피가 없습니다.</p>';
        return;
    }

    const html = recipeData.recipes.map(recipe => `
        <div class="recipe-card" data-recipe-id="${recipe.id}">
            <div class="recipe-image">
                <img src="${recipe.image}" alt="${recipe.title}">
            </div>
            <div class="recipe-content">
                <div class="recipe-header">
                    <h3 class="recipe-title">${recipe.title}</h3>
                    <span class="recipe-number">${recipe.number}</span>
                </div>
                <p class="recipe-benefit">${recipe.growth_benefit.description}</p>
                <div class="recipe-nutrients">
                    ${recipe.key_nutrients.map(nutrient => `
                        <span class="nutrient-tag">${nutrient}</span>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;

    // 카드 클릭 이벤트
    container.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', () => {
            const recipeId = card.dataset.recipeId;
            const recipe = recipeData.recipes.find(r => r.id === recipeId);
            if (recipe) {
                showRecipeDetail(recipe);
            }
        });
    });

    console.log('✅ 레시피 카드 렌더링 완료:', recipeData.recipes.length + '개');
}

// 레시피 상세 모달
function showRecipeDetail(recipe) {
    const modal = document.getElementById('recipeDetailModal');
    const modalBody = document.getElementById('recipeModalBody');

    let html = `
        <div class="recipe-detail">
            <!-- 헤더 -->
            <div class="recipe-detail-header">
                <div class="recipe-detail-image">
                    <img src="${recipe.image}" alt="${recipe.title}">
                </div>
                <h2 class="recipe-detail-title">${recipe.title}</h2>
                <span class="recipe-number-badge">${recipe.number}</span>
            </div>

            <!-- 핵심 효능 -->
            <div class="recipe-section">
                <h3>${recipe.growth_benefit.title}</h3>
                <p class="recipe-benefit-text">${recipe.growth_benefit.description}</p>
            </div>

            <!-- 주요 영양소 -->
            <div class="recipe-section">
                <h3>💊 주요 영양소</h3>
                <div class="recipe-nutrients-grid">
                    ${recipe.key_nutrients.map(nutrient => `
                        <span class="nutrient-badge">${nutrient}</span>
                    `).join('')}
                </div>
            </div>

            <!-- 재료 -->
            <div class="recipe-section">
                <h3>🛒 재료</h3>
                <ul class="recipe-ingredients">
                    ${recipe.ingredients.map(ingredient => `
                        <li>${ingredient}</li>
                    `).join('')}
                </ul>
            </div>

            <!-- 조리 순서 -->
            <div class="recipe-section">
                <h3>👨‍🍳 조리 순서</h3>
                <ol class="recipe-steps">
                    ${recipe.cooking_steps.map((step, index) => `
                        <li><strong>Step ${index + 1}.</strong> ${step}</li>
                    `).join('')}
                </ol>
            </div>

            <!-- 조리 팁 -->
            ${recipe.tips && recipe.tips.length > 0 ? `
                <div class="recipe-section recipe-tips">
                    ${recipe.tips.map(tip => `
                        <h3>${tip.title}</h3>
                        <p>${tip.content}</p>
                    `).join('')}
                </div>
            ` : ''}

            <!-- 키 성장 영양소 분석 -->
            ${recipe.growth_science ? `
                <div class="recipe-section recipe-science">
                    <h3>${recipe.growth_science.title}</h3>
                    <p style="white-space: pre-line; line-height: 1.8;">${recipe.growth_science.content}</p>
                </div>
            ` : ''}
        </div>
    `;

    modalBody.innerHTML = html;
    modal.classList.add('active');

    console.log('✅ 레시피 상세 모달 열림:', recipe.title);
}

// 사례 카드 렌더링
function renderCases() {
    const container = document.getElementById('casesList');
    
    if (!casesData || casesData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">사례가 없습니다.</p>';
        return;
    }

    const html = casesData.map((caseItem, index) => {
        const firstRecord = caseItem.measurements[0];
        const lastRecord = caseItem.measurements[caseItem.measurements.length - 1];
        const heightGrowth = lastRecord.height - firstRecord.height;
        const duration = calculateDuration(firstRecord.date, lastRecord.date);
        
        return `
            <div class="case-card" data-case-index="${index}">
                <div class="case-header">
                    <div class="case-name">
                        ${caseItem.gender === 'male' ? '👦' : '👧'} ${caseItem.name}
                    </div>
                    <span class="case-gender-badge ${caseItem.gender === 'male' ? 'badge-male' : 'badge-female'}">
                        ${caseItem.gender === 'male' ? '남아' : '여아'}
                    </span>
                </div>
                <div class="case-stats">
                    <div class="case-stat">
                        <div class="case-stat-label">치료 기간</div>
                        <div class="case-stat-value">${duration}</div>
                    </div>
                    <div class="case-stat">
                        <div class="case-stat-label">성장</div>
                        <div class="case-stat-value highlight">${firstRecord.height}cm → ${lastRecord.height}cm</div>
                    </div>
                    <div class="case-stat">
                        <div class="case-stat-label">증가량</div>
                        <div class="case-stat-value success">+${heightGrowth.toFixed(1)}cm</div>
                    </div>
                </div>
                <div class="case-summary">
                    ${caseItem.memo || '성장 치료를 통해 목표 달성'}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // 카드 클릭 이벤트
    container.querySelectorAll('.case-card').forEach(card => {
        card.addEventListener('click', () => {
            const caseIndex = parseInt(card.dataset.caseIndex);
            const caseItem = casesData[caseIndex];
            if (caseItem) {
                showCaseDetail(caseItem);
            }
        });
    });

    console.log('✅ 사례 카드 렌더링 완료:', casesData.length + '개');
}

// 기간 계산 함수
function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0 && months > 0) {
        return `${years}년 ${months}개월`;
    } else if (years > 0) {
        return `${years}년`;
    } else {
        return `${months}개월`;
    }
}

// 만 나이 계산 (숫자 반환)
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
    // 숫자로 반환 (toFixed는 문자열 반환하므로 parseFloat 사용)
    return parseFloat((years + months / 12).toFixed(2));
}

// 사례 상세 모달 표시
async function showCaseDetail(caseItem) {
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
    const modal = document.getElementById('caseDetailModal');
    const modalBody = document.getElementById('caseModalBody');
    
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
        <div class="modal-header">
            <div class="case-badge">${genderEmoji} ${genderText}</div>
            <h2>${caseItem.name}</h2>
            <p><span>만 ${age}세 내원</span><span>${duration} 치료</span></p>
        </div>
        
        <div class="modal-section">
            <h3>👨👩👦 환자 정보</h3>
            <div class="patient-info-grid">
                ${caseItem.fatherHeight ? `
                    <div class="patient-info-item">
                        <span class="info-label">아버지 키</span>
                        <span class="info-value">${caseItem.fatherHeight}cm</span>
                    </div>
                ` : ''}
                ${caseItem.motherHeight ? `
                    <div class="patient-info-item">
                        <span class="info-label">어머니 키</span>
                        <span class="info-value">${caseItem.motherHeight}cm</span>
                    </div>
                ` : ''}
                ${caseItem.targetHeight ? `
                    <div class="patient-info-item">
                        <span class="info-label">희망 키</span>
                        <span class="info-value highlight">${caseItem.targetHeight}cm</span>
                    </div>
                ` : ''}
                ${caseItem.specialNotes ? `
                    <div class="patient-info-item" style="grid-column: 1 / -1;">
                        <span class="info-label">특이사항</span>
                        <span class="info-value">${caseItem.specialNotes}</span>
                    </div>
                ` : ''}
            </div>
        </div>
        
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
        
        <div class="chart-section-fixed">
            <h3>📈 성장 그래프 (표준성장도표 포함)</h3>
            <div class="chart-wrapper-fixed">
                <canvas id="caseGrowthChart"></canvas>
            </div>
        </div>
        
        <div class="modal-section">
            <h3>📅 측정 기록 (${measurements.length}회)</h3>
            <div class="measurements-timeline">
                ${measurements.map((m, i) => {
                    const mAge = calculateAgeAtDate(caseItem.birthDate, m.date);
                    const growthFromPrev = i === 0 ? '' : `+${(m.height - measurements[i-1].height).toFixed(1)}cm`;
                    const memoHtml = m.memo ? m.memo.replace(/\\n/g, '<br>') : '';
                    
                    // 예측키 계산 (18세 미만일 때만)
                    let predictionHTML = '';
                    if (mAge < 18 && window.koreaGrowthStandard && window.koreaGrowthStandard.isLoaded) {
                        try {
                            const prediction = window.koreaGrowthStandard.predictAdultHeight(
                                m.height,
                                mAge,
                                caseItem.gender === 'male' ? 'male' : 'female'
                            );
                            
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
                                        ${caseItem.gender === 'male' ? '남아 👦' : '여아 👧'} 만 ${mAge}세
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
                            
                            ${m.memo ? `
                                <div class="measurement-memo">
                                    <div class="memo-icon">📝</div>
                                    <div class="memo-text">${memoHtml}</div>
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
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // 배경 스크롤 막기
    
    // 차트 생성
    setTimeout(() => {
        createSimpleCaseChart(caseItem);
        setupScrollHighlight(caseItem);
    }, 100);
    
    console.log('✅ 사례 상세 모달 열림:', caseItem.name);
}

// 스크롤 하이라이트 설정
function setupScrollHighlight(caseData) {
    const modalBody = document.getElementById('caseModalBody');
    const cards = modalBody.querySelectorAll('.measurement-card');
    
    if (!cards.length || !caseChart) return;
    
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
        cards.forEach(card => card.classList.remove('highlight'));
        
        // 현재 카드 하이라이트
        if (highlightIndex >= 0) {
            cards[highlightIndex].classList.add('highlight');
            updateChartHighlight(highlightIndex);
        }
    });
    
    console.log('✅ 스크롤 하이라이트 설정 완료');
}

// 차트 포인트 하이라이트 업데이트
function updateChartHighlight(highlightIndex) {
    if (!caseChart) return;
    
    const datasets = caseChart.data.datasets;
    // 환자 데이터셋은 order: 0
    const patientDataset = datasets.find(d => d.order === 0);
    
    if (!patientDataset || !patientDataset.data) {
        console.error('환자 데이터셋을 찾을 수 없습니다.');
        return;
    }
    
    const dataLength = patientDataset.data.length;
    
    // 포인트 크기 및 색상 초기화
    patientDataset.pointRadius = patientDataset.data.map((_, index) => 
        index === highlightIndex ? 14 : 10
    );
    patientDataset.pointHoverRadius = patientDataset.data.map((_, index) => 
        index === highlightIndex ? 16 : 12
    );
    patientDataset.pointBackgroundColor = patientDataset.data.map((_, index) => 
        index === highlightIndex ? '#f59e0b' : '#dc2626'
    );
    patientDataset.pointBorderWidth = patientDataset.data.map((_, index) => 
        index === highlightIndex ? 3 : 3
    );
    
    caseChart.update('none'); // 애니메이션 없이 즉시 업데이트
}

// 간단한 성장 차트 생성 - 5th/95th 백분위선 포함
function createSimpleCaseChart(caseData) {
    const canvas = document.getElementById('caseGrowthChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // 기존 차트 파괴
    if (caseChart) {
        caseChart.destroy();
    }
    
    // 환자 데이터 - 명확한 타입 변환
    const patientData = caseData.measurements.map(m => {
        const age = calculateAgeAtDate(caseData.birthDate, m.date);
        const height = parseFloat(m.height);
        return {
            x: age,
            y: height
        };
    });
    
    console.log('📊 환자 데이터:', patientData);
    console.log('📊 환자 데이터 개수:', patientData.length);
    console.log('📊 첫 번째 데이터:', patientData[0]);
    console.log('📊 데이터 타입 확인:', typeof patientData[0].x, typeof patientData[0].y);
    
    // 표준 성장 데이터 가져오기 (5th, 95th만)
    const standardData = getStandardGrowthDataFor5th95th(caseData.gender);
    
    console.log('📊 표준 데이터 개수:', standardData.length);
    
    // 환자 데이터셋 - 최대한 명확하게
    const patientDataset = {
        type: 'line',
        label: `👶 ${caseData.name}의 성장 기록`,
        data: patientData,
        borderColor: '#dc2626',
        backgroundColor: '#dc2626',
        borderWidth: 4,
        pointRadius: 10,
        pointHoverRadius: 12,
        pointBackgroundColor: '#dc2626',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointStyle: 'circle',
        tension: 0.3,
        fill: false,
        order: 0,
        showLine: true,
        spanGaps: false
    };
    
    console.log('📊 환자 데이터셋 생성 완료:', patientDataset);
    console.log('📊 데이터셋 data 속성:', patientDataset.data);
    
    caseChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                patientDataset,    // 환자 데이터 먼저
                ...standardData    // 백분위선 나중에
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
                        padding: 15,
                        font: { size: 12, weight: '600' },
                        boxWidth: 10,
                        boxHeight: 10
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 13, weight: 'bold' },
                    bodyFont: { size: 12 },
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
    
    console.log('📊 차트 생성 완료');
    console.log('📊 전체 데이터셋 수:', caseChart.data.datasets.length);
    
    // 모든 데이터셋 상세 정보 출력
    caseChart.data.datasets.forEach((ds, index) => {
        console.log(`📊 Dataset ${index}:`, {
            label: ds.label,
            order: ds.order,
            dataCount: ds.data ? ds.data.length : 0,
            firstPoint: ds.data ? ds.data[0] : null,
            pointRadius: ds.pointRadius,
            borderColor: ds.borderColor
        });
    });
    
    // 환자 데이터셋 찾기 (order: 0인 것)
    const patientDs = caseChart.data.datasets.find(d => d.order === 0);
    if (patientDs) {
        console.log('✅ 환자 데이터셋 확인:', patientDs.label);
        console.log('✅ 환자 데이터 포인트 개수:', patientDs.data.length);
        console.log('✅ 포인트 반경:', patientDs.pointRadius);
        console.log('✅ 포인트 색상:', patientDs.pointBackgroundColor);
        console.log('✅ 첫 번째 데이터 포인트:', patientDs.data[0]);
        console.log('✅ 모든 데이터 포인트:', patientDs.data);
    } else {
        console.error('❌ 환자 데이터셋을 찾을 수 없습니다!');
    }
    
    // 강제 업데이트
    caseChart.update('active');
}

// 표준 성장 데이터 가져오기 (5th, 50th, 95th)
function getStandardGrowthDataFor5th95th(gender) {
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
    
    return percentiles.map(p => ({
        label: labels[p],
        data: heightPercentileData[gender][p].map((height, index) => ({
            x: parseFloat(heightPercentileData.ages[index]),
            y: height
        })),
        borderColor: colors[p],
        backgroundColor: 'transparent',
        borderWidth: p === 'P50' ? 2.5 : 2,  // 50th는 조금 더 두껍게
        borderDash: p === 'P50' ? [3, 3] : [5, 5],  // 50th는 다른 패턴
        pointRadius: 0,
        tension: 0.4,
        order: 100,  // 백분위선은 모두 배경에
        fill: false
    }));
}

// FAQ 렌더링
function renderFAQ() {
    const container = document.getElementById('faqAccordion');
    
    if (!faqData || faqData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">FAQ가 없습니다.</p>';
        return;
    }

    const html = faqData.map((faq, index) => `
        <div class="faq-item" data-index="${index}">
            <button class="faq-question">
                <span>${faq.question}</span>
                <span class="faq-icon">▼</span>
            </button>
            <div class="faq-answer">
                <div class="faq-answer-content">${faq.answer}</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;

    // FAQ 클릭 이벤트
    container.querySelectorAll('.faq-item').forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        questionBtn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // 모든 FAQ 닫기
            container.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
            
            // 클릭한 FAQ만 열기
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    console.log('✅ FAQ 렌더링 완료:', faqData.length + '개');
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 성장 가이드 모달
    const modal = document.getElementById('cardDetailModal');
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');

    // 모달 닫기
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    overlay.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // 레시피 모달
    const recipeModal = document.getElementById('recipeDetailModal');
    const recipeCloseBtn = recipeModal.querySelector('.modal-close');
    const recipeOverlay = recipeModal.querySelector('.modal-overlay');

    // 레시피 모달 닫기
    recipeCloseBtn.addEventListener('click', () => {
        recipeModal.classList.remove('active');
    });

    recipeOverlay.addEventListener('click', () => {
        recipeModal.classList.remove('active');
    });

    // 사례 모달
    const caseModal = document.getElementById('caseDetailModal');
    const caseCloseBtn = caseModal.querySelector('.modal-close');

    // 사례 모달 닫기
    caseCloseBtn.addEventListener('click', () => {
        caseModal.classList.remove('active');
        document.body.style.overflow = ''; // 배경 스크롤 복원
        if (caseChart) {
            caseChart.destroy();
            caseChart = null;
        }
    });

    // 섹션 탭 전환
    const sectionTabs = document.querySelectorAll('.section-tab');
    sectionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const section = tab.dataset.section;
            
            // 탭 활성 상태 변경
            sectionTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // 섹션 표시/숨김
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            if (section === 'guide') {
                document.getElementById('guideSection').classList.add('active');
            } else if (section === 'recipe') {
                document.getElementById('recipeSection').classList.add('active');
            } else if (section === 'cases') {
                document.getElementById('casesSection').classList.add('active');
            } else if (section === 'faq') {
                document.getElementById('faqSection').classList.add('active');
            }
        });
    });
}

// 유틸리티 함수
function getCategoryName(categoryId) {
    const category = growthGuideData.categories.find(c => c.id === categoryId);
    return category ? category.name : '';
}

function getCtaText(cta) {
    const ctaTexts = {
        'start_growth_diary': '성장 기록 시작하기',
        'book_appointment': '상담 예약하기',
        'save_checklist': '체크리스트 저장하기'
    };
    return ctaTexts[cta] || '자세히 보기';
}

function handleCTA(cta) {
    console.log('CTA 클릭:', cta);
    
    switch (cta) {
        case 'start_growth_diary':
            window.location.href = 'record.html';
            break;
        case 'book_appointment':
            alert('상담 예약 기능은 준비 중입니다.');
            break;
        case 'save_checklist':
            alert('체크리스트가 저장되었습니다.');
            break;
        default:
            console.log('알 수 없는 CTA:', cta);
    }
}

// 기본 FAQ 데이터
function getDefaultFAQs() {
    return [
        {
            question: "성장 도표는 어떻게 읽나요?",
            answer: "성장 도표의 백분위는 같은 연령대 100명 중 우리 아이가 어느 위치에 있는지 보여줍니다. 50백분위가 평균이며, 3백분위~97백분위가 정상 범위입니다."
        },
        {
            question: "뼈나이 검사는 언제 받아야 하나요?",
            answer: "만 4세 이상부터 연 1회 검사를 권장합니다. 특히 성장이 느린 경우나 사춘기가 빠른 경우 조기 검사가 필요합니다."
        },
        {
            question: "성장호르몬 주사는 누구에게 필요한가요?",
            answer: "성장호르몬 결핍이 의학적으로 진단된 경우에 처방됩니다. 전문의와 상담 후 결정해야 합니다."
        }
    ];
}

// 예측 방법 설명 모달 표시
function showPredictionMethodModal(method) {
    // 간단한 alert로 표시
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
