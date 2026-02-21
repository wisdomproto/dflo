// 정보 모바일 스크립트

// 초기 데이터 로드
async function loadInitialFaqData() {
    console.log('📋 FAQ 초기 데이터 로드 시도...');
    try {
        const existingFaqs = localStorage.getItem('adminFaqs');
        console.log('📋 기존 localStorage FAQ:', existingFaqs ? JSON.parse(existingFaqs).length + '개' : '없음');
        
        if (!existingFaqs || JSON.parse(existingFaqs).length === 0) {
            console.log('📋 data/faqs.json 파일 로드 시도...');
            const response = await fetch('data/faqs.json');
            console.log('📋 Fetch 응답 상태:', response.status, response.statusText);
            
            if (response.ok) {
                const faqs = await response.json();
                localStorage.setItem('adminFaqs', JSON.stringify(faqs));
                console.log('✅ FAQ 초기 데이터 로드 완료:', faqs.length, '개');
                return true;
            } else {
                console.error('❌ FAQ 파일 로드 실패:', response.status);
            }
        } else {
            console.log('ℹ️ 기존 FAQ 데이터 사용');
        }
    } catch (error) {
        console.error('❌ FAQ 초기 데이터 로드 에러:', error);
    }
    return false;
}

// FAQ 데이터 가져오기 (localStorage 우선, 없으면 기본 데이터)
function getFaqData() {
    const adminFaqs = JSON.parse(localStorage.getItem('adminFaqs') || '[]');
    
    // localStorage에 데이터가 있으면 사용
    if (adminFaqs.length > 0) {
        // 카테고리 매핑 (한글 → 영어)
        const categoryMap = {
            '성장': 'growth',
            '운동': 'exercise',
            '영양': 'nutrition',
            '수면': 'sleep',
            '자세': 'posture',
            '기타': 'other'
        };
        
        return adminFaqs.map(faq => ({
            category: categoryMap[faq.category] || 'other',
            question: faq.question,
            answer: faq.answer
        }));
    }
    
    // 기본 FAQ 데이터 (fallback)
    return [
        {
            category: 'growth',
            question: '우리 아이의 키가 작은 편인데, 언제 병원을 방문해야 하나요?',
            answer: '또래에 비해 10cm 이상 작거나, 1년에 4cm 미만으로 자라는 경우 전문의 상담이 필요합니다. 또한 성장곡선에서 P3(하위 3%) 미만인 경우에도 성장클리닉 방문을 권장합니다.'
        },
    {
        category: 'growth',
        question: '성장기는 언제까지인가요?',
        answer: '일반적으로 여아는 초경 후 2-3년, 남아는 변성기 후 2-3년까지 성장합니다. 성장판이 닫히기 전까지는 성장이 가능하므로, 정확한 진단을 위해서는 골연령 검사가 필요합니다.'
    },
    {
        category: 'growth',
        question: '부모의 키가 작으면 아이도 작을 수밖에 없나요?',
        answer: '부모의 키는 아이 최종 키의 약 23%만 결정합니다. 나머지 77%는 영양, 운동, 수면, 스트레스 등 환경적 요인에 의해 결정되므로, 적절한 관리로 충분히 키를 키울 수 있습니다.'
    },
    {
        category: 'exercise',
        question: '성장에 도움이 되는 운동은 무엇인가요?',
        answer: '줄넘기, 농구, 배구, 수영 등 성장판을 자극하는 운동이 좋습니다. 하루 30분 이상, 주 5일 이상 꾸준히 하는 것이 중요합니다. 스트레칭도 함께 하면 더욱 효과적입니다.'
    },
    {
        category: 'exercise',
        question: '근력운동을 하면 키가 안 크나요?',
        answer: '적절한 근력운동은 성장에 도움이 됩니다. 다만 과도한 중량운동이나 무리한 운동은 성장판에 손상을 줄 수 있으므로 주의가 필요합니다.'
    },
    {
        category: 'nutrition',
        question: '성장에 좋은 음식은 무엇인가요?',
        answer: '우유, 치즈 등 칼슘이 풍부한 유제품, 고기, 생선, 달걀 등 단백질 식품, 채소와 과일 등이 좋습니다. 인스턴트식품, 탄산음료, 패스트푸드는 피하는 것이 좋습니다.'
    },
    {
        category: 'nutrition',
        question: '키 크는 영양제를 먹이면 효과가 있나요?',
        answer: '칼슘, 비타민D, 아연 등의 영양제는 식사만으로 부족한 영양소를 보충하는 데 도움이 될 수 있습니다. 하지만 영양제만으로는 키가 크지 않으며, 균형 잡힌 식사가 가장 중요합니다.'
    },
    {
        category: 'sleep',
        question: '수면이 성장에 정말 중요한가요?',
        answer: '네, 매우 중요합니다. 성장호르몬은 주로 밤 10시부터 새벽 2시 사이, 깊은 잠을 잘 때 가장 많이 분비됩니다. 초등학생은 하루 9-10시간, 청소년은 8-9시간의 충분한 수면이 필요합니다.'
    },
    {
        category: 'sleep',
        question: '늦게 자도 오래 자면 괜찮나요?',
        answer: '아닙니다. 성장호르몬은 밤 10시~새벽 2시 사이에 가장 많이 분비되므로, 이 시간대에 깊은 잠을 자는 것이 중요합니다.'
    },
    {
        category: 'posture',
        question: '자세가 키 성장에 영향을 주나요?',
        answer: '네, 바른 자세는 성장에 매우 중요합니다. 거북목, 굽은 등 등 나쁜 자세는 척추의 성장판을 압박하여 성장을 방해할 수 있습니다. 평소 바른 자세를 유지하고 스트레칭을 꾸준히 하는 것이 좋습니다.'
    },
    {
        category: 'posture',
        question: '일자목, 거북목은 어떻게 교정하나요?',
        answer: '스마트폰과 컴퓨터 사용 시간을 줄이고, 모니터 높이를 눈높이에 맞추는 것이 중요합니다. 목 스트레칭과 등 근육 강화 운동을 꾸준히 하면 개선할 수 있습니다.'
    },
    {
        category: 'etc',
        question: '성장호르몬 주사는 언제 맞아야 하나요?',
        answer: '성장호르몬 주사는 성장호르몬 결핍증으로 진단받은 경우에만 필요합니다. 정확한 진단을 위해서는 전문의의 검사가 필요하며, 무분별한 호르몬 주사는 오히려 부작용을 일으킬 수 있습니다.'
    }
    ];
}

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async function() {
    await loadInitialFaqData();
    renderFAQ();
});

function renderFAQ() {
    const faqData = getFaqData();
    const container = document.getElementById('faqContainer');
    const filteredData = currentFilter === 'all' 
        ? faqData 
        : faqData.filter(faq => faq.category === currentFilter);
    
    container.innerHTML = filteredData.map(faq => `
        <div class="faq-item" data-category="${faq.category}">
            <div class="faq-question" onclick="toggleFAQ(this)">
                <div class="faq-q-content">
                    <div class="faq-category-badge ${faq.category}">${getCategoryName(faq.category)}</div>
                    <div class="faq-q-text">${faq.question}</div>
                </div>
                <div class="faq-icon">▼</div>
            </div>
            <div class="faq-answer">
                <div class="faq-a-content">${faq.answer}</div>
            </div>
        </div>
    `).join('');
}

function toggleFAQ(element) {
    const faqItem = element.parentElement;
    const isActive = faqItem.classList.contains('active');
    
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (!isActive) {
        faqItem.classList.add('active');
    }
}

function filterFAQ(category) {
    currentFilter = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (category === 'all') {
        faqItems.forEach(item => {
            item.classList.remove('hidden');
        });
    } else {
        faqItems.forEach(item => {
            if (item.dataset.category === category) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    }
}

function getCategoryName(category) {
    const names = {
        growth: '성장',
        exercise: '운동',
        nutrition: '영양',
        sleep: '수면',
        posture: '자세',
        etc: '기타'
    };
    return names[category] || category;
}

// 성장 시크릿 아코디언 토글
function toggleSecret(element) {
    const isActive = element.classList.contains('active');
    
    // 다른 섹션 닫기
    document.querySelectorAll('.secret-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 클릭한 섹션 토글
    if (!isActive) {
        element.classList.add('active');
    }
}
