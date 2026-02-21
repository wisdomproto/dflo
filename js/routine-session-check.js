// ===== 데일리 루틴 - 세션 체크 및 데이터 초기화 =====
// 이 스크립트는 페이지 로드 시 즉시 실행됩니다

const SESSION_KEY = 'growth_care_user';
const CHILDREN_KEY = 'growth_care_children';

const userJson = sessionStorage.getItem(SESSION_KEY);
if (!userJson) {
    alert('로그인이 필요합니다.');
    window.location.href = 'index.html';
} else {
    try {
        const user = JSON.parse(userJson);
        const childrenJson = sessionStorage.getItem(CHILDREN_KEY);
        if (childrenJson) {
            const children = JSON.parse(childrenJson);
            localStorage.setItem('children', JSON.stringify(children));
            
            // DB에서 가져온 measurements 데이터를 localStorage routine 형식으로 변환
            console.log('📊 [routine.html] measurements 데이터 변환 시작');
            let totalConverted = 0;
            
            children.forEach(child => {
                if (child.measurements && child.measurements.length > 0) {
                    console.log(`  처리 중: ${child.name} - ${child.measurements.length}개 측정 기록`);
                    
                    child.measurements.forEach(measurement => {
                        console.log('    원본 measurement:', measurement);
                        
                        // DB의 measurements를 routine 형식으로 변환
                        const routineData = {
                            childId: child.id,
                            date: measurement.measured_date,
                            actualAge: measurement.age_at_measurement || measurement.age || null,
                            height: measurement.height || null,
                            weight: measurement.weight || null,
                            predictedHeightBasic: measurement.predicted_height || null,
                            boneAge: measurement.bone_age || null,
                            predictedHeightBoneAge: null,
                            measurementNotes: measurement.notes || '',
                            savedAt: measurement.created_at || new Date().toISOString()
                        };
                        
                        console.log('    변환된 routineData:', routineData);
                        
                        // localStorage에 저장
                        const storageKey = `routine_${child.id}_${measurement.measured_date}`;
                        localStorage.setItem(storageKey, JSON.stringify(routineData));
                        totalConverted++;
                    });
                }
            });
            
            console.log(`✅ [routine.html] ${totalConverted}개 측정 기록 변환 완료`);
            
            if (children.length > 0 && !localStorage.getItem('selectedChildId')) {
                localStorage.setItem('selectedChildId', children[0].id);
            }
        }
    } catch (error) {
        console.error('세션 오류:', error);
        window.location.href = 'home.html';
    }
}
