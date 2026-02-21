# 🎨 모달 작업 가이드

## ✅ HTML 구조 (표준)

```html
<div class="modal-name-modal" id="modalNameModal" style="display: none;">
    <div class="modal-name-content">
        <div class="modal-name-header">
            <h2>📋 모달 제목</h2>
            <button class="modal-close-btn" onclick="closeModalName()">×</button>
        </div>
        
        <div class="modal-name-body">
            <!-- 내용 -->
        </div>
        
        <div class="modal-name-footer">
            <button class="btn-cancel" onclick="closeModalName()">취소</button>
            <button class="btn-primary" onclick="confirmModalName()">확인</button>
        </div>
    </div>
</div>
```

---

## 🎨 CSS 패턴

### 기본 스타일
```css
.modal-name-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal-name-content {
    background: white;
    border-radius: 16px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-close-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: #f3f4f6;
    color: #6b7280;
    font-size: 1.5rem;
    cursor: pointer;
}
```

---

## 💻 JavaScript 패턴

### 모달 열기/닫기
```javascript
function openModalName() {
    const modal = document.getElementById('modalNameModal');
    modal.style.display = 'flex';
    
    // 데이터 로드 등
    loadModalData();
}

function closeModalName() {
    const modal = document.getElementById('modalNameModal');
    modal.style.display = 'none';
}

// 전역 함수로 노출
window.openModalName = openModalName;
window.closeModalName = closeModalName;
```

---

## 📁 파일 구조

```
project/
├── [page].html
│   └── <div class="modal-name-modal">...</div>
├── css/
│   └── [modal-name]-modal.css
└── js/
    └── [modal-name]-modal.js
```

---

## 📌 네이밍 규칙

```
모달 이름: routine-calendar

HTML:
- 클래스: .routine-calendar-modal
- ID: #routineCalendarModal

CSS:
- 파일: routine-calendar-modal.css

JavaScript:
- 파일: routine-calendar-modal.js
- 함수: openRoutineCalendar()
        closeRoutineCalendar()
```

---

## ⚠️ 주의사항

1. **z-index**: 10000 이상 (다른 요소 위에 표시)
2. **backdrop**: `background: rgba(0, 0, 0, 0.5)` 고정
3. **닫기**: backdrop 클릭 시 닫기 추가 가능
4. **스크롤**: `overflow-y: auto` 필수

---

## 📌 체크리스트

- [ ] HTML 구조 표준대로 작성
- [ ] CSS 파일 분리
- [ ] JS 함수 전역 노출
- [ ] 닫기 버튼 동작 확인
- [ ] 모바일 반응형 확인

---

**참조:** `QUICK_RULES.md` > UI/모달 작업
