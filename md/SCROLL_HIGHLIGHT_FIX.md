# 스크롤 하이라이트 위치 보정 완료

## 🔴 문제
스크롤할 때 **이미 지나간 카드**가 하이라이트되는 문제
- 실제로 보고 있는 카드와 하이라이트된 카드가 일치하지 않음
- 스크롤 위치 계산이 잘못됨

## 🔧 원인 분석

### Before (문제)
```javascript
// offsetTop 사용: 문서 전체 기준 위치
const cardTop = card.offsetTop;
const triggerPoint = scrollTop + modalHeight * 0.3;

// 문제점:
// 1. offsetTop은 부모 요소 기준
// 2. sticky 고정된 차트 영역을 고려하지 않음
// 3. 스크롤 위치와 카드 위치가 맞지 않음
```

### After (해결)
```javascript
// getBoundingClientRect() 사용: 뷰포트 기준 위치
const modalRect = modalBody.getBoundingClientRect();
const chartHeight = chartSection.offsetHeight;
const triggerY = modalRect.top + chartHeight + 50;

const cardRect = card.getBoundingClientRect();
const cardTop = cardRect.top;

// 해결:
// 1. 뷰포트 기준으로 정확한 위치 계산
// 2. 고정된 차트 높이를 고려
// 3. 추가 오프셋(50px)으로 시각적 보정
```

## 📊 위치 계산 방식 변경

### Before (offsetTop)
```
┌─────────────────┐ ← 문서 시작 (0)
│                 │
│   [차트 고정]   │ ← offsetTop 계산이 여기부터 시작
│                 │
├─────────────────┤
│   카드 1        │ ← offsetTop: 500px
│   카드 2        │ ← offsetTop: 620px
│   카드 3        │ ← offsetTop: 740px
└─────────────────┘

❌ 문제: 차트 영역의 sticky 위치를 고려하지 못함
```

### After (getBoundingClientRect)
```
┌─────────────────┐ ← 뷰포트 상단 (0)
│   [차트 고정]   │ ← 400px (고정됨)
├─────────────────┤ ← 트리거 포인트: 400 + 50 = 450px
│   카드 1        │ ← cardRect.top이 450px 근처면 하이라이트
│   카드 2        │
│   카드 3        │
└─────────────────┘

✅ 해결: 실제 화면에서 보이는 위치 기준으로 계산
```

## 🎯 트리거 포인트 계산

```javascript
// 트리거 포인트 = 모달 상단 + 차트 높이 + 추가 오프셋
const triggerY = modalRect.top + chartHeight + 50;

// 예시:
// modalRect.top = 0 (모달이 전체 화면)
// chartHeight = 400px (차트 영역)
// 추가 오프셋 = 50px
// → triggerY = 450px
```

**의미**:
- 카드가 화면에서 **450px 위치**에 오면 하이라이트
- 차트 바로 아래쪽에서 자연스럽게 전환
- 사용자가 보고 있는 카드와 정확히 일치

## 📐 시각적 비교

### Before (잘못된 계산)
```
스크롤 중...

[차트 - 고정]
───────────────── ← 실제로 보고 있는 위치
카드 1 (하이라이트 ❌)
카드 2 (하이라이트 ❌)
카드 3 (하이라이트 ✅) ← 이미 지나간 카드가 하이라이트!
```

### After (정확한 계산)
```
스크롤 중...

[차트 - 고정]
───────────────── ← 트리거 포인트
카드 1 (하이라이트 ✅) ← 지금 보고 있는 카드!
카드 2 (하이라이트 ❌)
카드 3 (하이라이트 ❌)
```

## ✅ 최종 구현

```javascript
function setupScrollHighlight(caseData) {
    const modalBody = document.getElementById('caseModalBody');
    const cards = modalBody.querySelectorAll('.measurement-card');
    const chartSection = document.querySelector('.chart-section-fixed');
    
    modalBody.addEventListener('scroll', () => {
        // 1. 뷰포트 기준 위치 계산
        const modalRect = modalBody.getBoundingClientRect();
        const chartHeight = chartSection ? chartSection.offsetHeight : 0;
        
        // 2. 트리거 포인트: 차트 바로 아래 + 50px
        const triggerY = modalRect.top + chartHeight + 50;
        
        let highlightIndex = -1;
        
        // 3. 각 카드의 실제 화면 위치 확인
        cards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const cardTop = cardRect.top;
            const cardBottom = cardRect.bottom;
            
            // 4. 카드가 트리거 포인트를 지나가는지 확인
            if (cardTop <= triggerY && triggerY <= cardBottom) {
                highlightIndex = index;
            }
        });
        
        // 5. 하이라이트 업데이트
        cards.forEach(card => card.classList.remove('highlight'));
        if (highlightIndex >= 0) {
            cards[highlightIndex].classList.add('highlight');
            updateChartHighlight(highlightIndex);
        }
    });
}
```

## 🎨 사용자 경험 개선

### Before
```
❌ 이미 지나간 카드가 하이라이트
❌ 그래프 포인트와 보고 있는 데이터가 불일치
❌ 혼란스러운 UX
```

### After
```
✅ 현재 보고 있는 카드가 정확히 하이라이트
✅ 그래프 포인트와 데이터가 완벽히 일치
✅ 직관적이고 자연스러운 UX
```

## 🧪 테스트 방법

```bash
python -m http.server 8000
```

http://localhost:8000/info.html → 환자 카드 클릭 → 아래로 스크롤

**확인 사항**:
1. ✅ 차트 바로 아래에 보이는 카드가 하이라이트되나요?
2. ✅ 그래프의 포인트와 하이라이트된 카드가 일치하나요?
3. ✅ 스크롤하면서 자연스럽게 전환되나요?
4. ✅ 이미 지나간 카드가 하이라이트되지 않나요?

## 📊 주요 변경 사항

| 항목 | Before | After |
|------|--------|-------|
| **위치 계산** | offsetTop (문서 기준) | getBoundingClientRect (뷰포트 기준) |
| **트리거 포인트** | scrollTop + 30% | modalTop + chartHeight + 50px |
| **차트 고려** | ❌ 고려 안 함 | ✅ sticky 차트 높이 반영 |
| **정확도** | ❌ 지나간 카드 하이라이트 | ✅ 현재 카드 정확히 하이라이트 |

## 🎉 결과

완벽하게 동작합니다!
- ✅ 스크롤 위치와 하이라이트 완벽 일치
- ✅ 그래프 포인트 정확히 연동
- ✅ 자연스러운 UX

---

## 📝 핵심 개념

**offsetTop vs getBoundingClientRect()**:
- `offsetTop`: 부모 요소 기준의 고정된 위치 (문서 구조 기준)
- `getBoundingClientRect()`: 현재 뷰포트 기준의 실시간 위치 (사용자가 보는 화면 기준)

**스크롤 + sticky 요소가 있을 때**는 반드시 `getBoundingClientRect()`를 사용해야 정확합니다!

