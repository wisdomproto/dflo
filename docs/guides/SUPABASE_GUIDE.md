# 🔧 Supabase 작업 가이드

## ✅ 초기화 방법

### HTML 파일에서 (권장)
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
    // ✅ var 사용 (전역 스코프)
    const SUPABASE_URL = 'https://mufjnulwnppgvibmmbfo.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_3hm8ooVxIZvENDh-D_lWNA_sdPHg9xk';
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase 클라이언트 초기화 완료');
</script>
```

### ❌ 하지 말 것
```javascript
// const는 블록 스코프 → 다른 파일에서 접근 불가
const supabase = window.supabase.createClient(...);
```

---

## 🔐 URL/Key (절대 변경 금지)

```javascript
// 모든 페이지에서 이 값 사용
const SUPABASE_URL = 'https://mufjnulwnppgvibmmbfo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3hm8ooVxIZvENDh-D_lWNA_sdPHg9xk';
```

---

## 📊 쿼리 패턴

### 단일 레코드 조회
```javascript
const { data, error } = await supabase
    .from('daily_routines')
    .select('*')
    .eq('id', recordId)
    .single();
```

### 날짜 범위 조회
```javascript
const { data, error } = await supabase
    .from('daily_routines')
    .select('*')
    .eq('child_id', childId)
    .gte('routine_date', '2026-02-01')
    .lte('routine_date', '2026-02-29')
    .order('routine_date', { ascending: false });
```

### 데이터 삽입
```javascript
const { data, error } = await supabase
    .from('daily_routines')
    .insert({
        child_id: childId,
        routine_date: '2026-02-05',
        weight: 61.5,
        height: 172.5
    })
    .select()
    .single();
```

### 데이터 업데이트
```javascript
const { data, error } = await supabase
    .from('daily_routines')
    .update({ weight: 62.0 })
    .eq('id', recordId);
```

---

## ⚠️ 에러 처리

```javascript
try {
    const { data, error } = await supabase
        .from('daily_routines')
        .select('*');
    
    if (error) throw error;
    
    console.log('✅ 데이터 로드 성공:', data);
} catch (err) {
    console.error('❌ Supabase 에러:', err);
    // 대체 로직 (localStorage 등)
}
```

---

## 📌 체크리스트

작업 전 확인:
- [ ] URL/Key가 올바른지
- [ ] `var` 사용했는지
- [ ] 에러 처리 추가했는지
- [ ] 콘솔 로그 추가했는지

---

**참조:** `QUICK_RULES.md` > Supabase 관련 작업
