// 모바일 메뉴 토글
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    navMenu.classList.toggle('active');
}

// 로컬 스토리지 관리
const StorageManager = {
    // ===== 아이 관리 =====
    
    // 모든 아이 목록 가져오기
    getChildren() {
        return JSON.parse(localStorage.getItem('children') || '[]');
    },
    
    // 아이 목록 저장
    saveChildren(children) {
        localStorage.setItem('children', JSON.stringify(children));
    },
    
    // 아이 추가
    addChild(child) {
        const children = this.getChildren();
        const newChild = {
            id: 'child-' + Date.now(),
            name: child.name,
            gender: child.gender, // 'male' or 'female'
            birthDate: child.birthDate,
            createdAt: new Date().toISOString()
        };
        children.push(newChild);
        localStorage.setItem('children', JSON.stringify(children));
        
        // 첫 번째 아이면 자동 선택
        if (children.length === 1) {
            this.setSelectedChild(newChild.id);
        }
        
        return newChild;
    },
    
    // 아이 수정
    updateChild(childId, updates) {
        const children = this.getChildren();
        const index = children.findIndex(c => c.id === childId);
        if (index !== -1) {
            children[index] = { ...children[index], ...updates };
            localStorage.setItem('children', JSON.stringify(children));
        }
    },
    
    // 아이 삭제
    deleteChild(childId) {
        let children = this.getChildren();
        children = children.filter(c => c.id !== childId);
        localStorage.setItem('children', JSON.stringify(children));
        
        // 삭제한 아이가 선택된 아이였다면
        if (this.getSelectedChildId() === childId) {
            // 다른 아이가 있으면 첫 번째 아이 선택, 없으면 null
            const newSelectedId = children.length > 0 ? children[0].id : null;
            this.setSelectedChild(newSelectedId);
        }
        
        // 해당 아이의 모든 데이터 삭제
        this.deleteChildData(childId);
    },
    
    // 선택된 아이 ID 가져오기
    getSelectedChildId() {
        return localStorage.getItem('selectedChildId');
    },
    
    // 선택된 아이 설정
    setSelectedChild(childId) {
        if (childId) {
            localStorage.setItem('selectedChildId', childId);
        } else {
            localStorage.removeItem('selectedChildId');
        }
        // 전역 이벤트 발생
        window.dispatchEvent(new CustomEvent('childChanged', { detail: { childId } }));
    },
    
    // 선택된 아이 정보 가져오기
    getSelectedChild() {
        const childId = this.getSelectedChildId();
        if (!childId) return null;
        
        const children = this.getChildren();
        return children.find(c => c.id === childId) || null;
    },
    
    // 아이의 모든 데이터 삭제
    deleteChildData(childId) {
        // 성장 기록 삭제
        const allRecords = JSON.parse(localStorage.getItem('growthRecords') || '{}');
        delete allRecords[childId];
        localStorage.setItem('growthRecords', JSON.stringify(allRecords));
        
        // 챌린지 삭제
        const allChallenges = JSON.parse(localStorage.getItem('challenges') || '{}');
        delete allChallenges[childId];
        localStorage.setItem('challenges', JSON.stringify(allChallenges));
    },
    
    // ===== 성장 기록 (아이별로 분리) =====
    
    getGrowthRecords(childId = null) {
        const targetChildId = childId || this.getSelectedChildId();
        console.log('getGrowthRecords - targetChildId:', targetChildId);
        
        if (!targetChildId) {
            console.warn('getGrowthRecords - targetChildId가 없습니다!');
            return [];
        }
        
        const allRecords = JSON.parse(localStorage.getItem('growthRecords') || '{}');
        console.log('getGrowthRecords - allRecords:', allRecords);
        console.log('getGrowthRecords - allRecords[targetChildId]:', allRecords[targetChildId]);
        
        return allRecords[targetChildId] || [];
    },
    
    saveGrowthRecord(record, childId = null) {
        const targetChildId = childId || this.getSelectedChildId();
        console.log('saveGrowthRecord - targetChildId:', targetChildId);
        
        if (!targetChildId) {
            console.error('saveGrowthRecord - targetChildId가 없습니다!');
            return;
        }
        
        const allRecords = JSON.parse(localStorage.getItem('growthRecords') || '{}');
        console.log('saveGrowthRecord - 저장 전 allRecords:', allRecords);
        
        if (!allRecords[targetChildId]) {
            allRecords[targetChildId] = [];
        }
        allRecords[targetChildId].push(record);
        
        console.log('saveGrowthRecord - 저장 후 allRecords:', allRecords);
        localStorage.setItem('growthRecords', JSON.stringify(allRecords));
        
        // 저장 직후 확인
        const verify = JSON.parse(localStorage.getItem('growthRecords') || '{}');
        console.log('saveGrowthRecord - 저장 검증:', verify);
    },
    
    deleteGrowthRecord(index, childId = null) {
        const targetChildId = childId || this.getSelectedChildId();
        if (!targetChildId) return;
        
        const allRecords = JSON.parse(localStorage.getItem('growthRecords') || '{}');
        if (allRecords[targetChildId]) {
            allRecords[targetChildId].splice(index, 1);
            localStorage.setItem('growthRecords', JSON.stringify(allRecords));
        }
    },
    
    // ===== 예상키 예측 기록 (아이별로 분리) =====
    
    getHeightPredictions(childId = null) {
        const targetChildId = childId || this.getSelectedChildId();
        if (!targetChildId) return [];
        
        const allPredictions = JSON.parse(localStorage.getItem('heightPredictions') || '{}');
        return allPredictions[targetChildId] || [];
    },
    
    saveHeightPrediction(prediction, childId = null) {
        const targetChildId = childId || this.getSelectedChildId();
        if (!targetChildId) return;
        
        const allPredictions = JSON.parse(localStorage.getItem('heightPredictions') || '{}');
        if (!allPredictions[targetChildId]) {
            allPredictions[targetChildId] = [];
        }
        allPredictions[targetChildId].push(prediction);
        localStorage.setItem('heightPredictions', JSON.stringify(allPredictions));
    },
    
    deleteHeightPrediction(index, childId = null) {
        const targetChildId = childId || this.getSelectedChildId();
        if (!targetChildId) return;
        
        const allPredictions = JSON.parse(localStorage.getItem('heightPredictions') || '{}');
        if (allPredictions[targetChildId]) {
            allPredictions[targetChildId].splice(index, 1);
            localStorage.setItem('heightPredictions', JSON.stringify(allPredictions));
        }
    },
    
    // ===== 챌린지 기록 (아이별로 분리) =====
    
    getChallenges(childId = null) {
        const targetChildId = childId || this.getSelectedChildId();
        if (!targetChildId) return {};
        
        const allChallenges = JSON.parse(localStorage.getItem('challenges') || '{}');
        return allChallenges[targetChildId] || {};
    },
    
    saveChallengeCompletion(category, item, date, childId = null) {
        const targetChildId = childId || this.getSelectedChildId();
        if (!targetChildId) return;
        
        const allChallenges = JSON.parse(localStorage.getItem('challenges') || '{}');
        if (!allChallenges[targetChildId]) {
            allChallenges[targetChildId] = {};
        }
        
        const childChallenges = allChallenges[targetChildId];
        if (!childChallenges[category]) {
            childChallenges[category] = {};
        }
        if (!childChallenges[category][item]) {
            childChallenges[category][item] = [];
        }
        if (!childChallenges[category][item].includes(date)) {
            childChallenges[category][item].push(date);
        }
        
        localStorage.setItem('challenges', JSON.stringify(allChallenges));
    },
    
    // 통계 계산
    getStats(childId = null) {
        const targetChildId = childId || this.getSelectedChildId();
        if (!targetChildId) {
            return {
                growthRecords: 0,
                challengeStreak: 0,
                badges: 0
            };
        }
        
        const growthRecords = this.getGrowthRecords(targetChildId);
        const challenges = this.getChallenges(targetChildId);
        
        // 챌린지 연속 일수 계산
        let maxStreak = 0;
        for (const category in challenges) {
            for (const item in challenges[category]) {
                const dates = challenges[category][item].sort();
                let currentStreak = 0;
                let tempStreak = 1;
                
                for (let i = 1; i < dates.length; i++) {
                    const prevDate = new Date(dates[i-1]);
                    const currDate = new Date(dates[i]);
                    const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays === 1) {
                        tempStreak++;
                    } else {
                        tempStreak = 1;
                    }
                    
                    if (tempStreak > currentStreak) {
                        currentStreak = tempStreak;
                    }
                }
                
                if (currentStreak > maxStreak) {
                    maxStreak = currentStreak;
                }
            }
        }
        
        // 배지 개수 계산 (임의 기준)
        let badges = 0;
        if (growthRecords.length >= 5) badges++;
        if (growthRecords.length >= 10) badges++;
        if (maxStreak >= 7) badges++;
        if (maxStreak >= 30) badges++;
        
        return {
            growthRecords: growthRecords.length,
            challengeStreak: maxStreak,
            badges: badges
        };
    }
};

// 페이지 로드 시 통계 업데이트
document.addEventListener('DOMContentLoaded', function() {
    // 아이가 선택되어 있는지 확인
    const selectedChild = StorageManager.getSelectedChild();
    if (!selectedChild) {
        const children = StorageManager.getChildren();
        if (children.length > 0) {
            StorageManager.setSelectedChild(children[0].id);
        }
    }
    
    updateStats();
});

function updateStats() {
    const stats = StorageManager.getStats();
    
    const growthElement = document.getElementById('growthRecords');
    const streakElement = document.getElementById('challengeStreak');
    const badgesElement = document.getElementById('badges');
    
    if (growthElement) {
        animateNumber(growthElement, 0, stats.growthRecords, 1000);
    }
    
    if (streakElement) {
        animateNumber(streakElement, 0, stats.challengeStreak, 1000);
    }
    
    if (badgesElement) {
        animateNumber(badgesElement, 0, stats.badges, 1000);
    }
}

// 숫자 애니메이션
function animateNumber(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

// 날짜 포맷팅
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 오늘 날짜
function getTodayDate() {
    return formatDate(new Date());
}
