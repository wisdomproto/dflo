// ================================================
// 187 성장케어 - 관리자 페이지 스크립트
// ================================================

// 전역 변수
let currentTab = 'patients';
let currentFilter = 'all';
let allPatients = [];
let allRecipes = [];
let allCases = [];
let allGuides = [];

// ================================================
// 초기화
// ================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 관리자 페이지 초기화...');
    
    // 현재 탭 로드
    await loadCurrentTab();
    
    // 폼 이벤트 리스너
    setupFormListeners();
});

// ================================================
// 탭 전환
// ================================================
async function switchAdminTab(tabName) {
    currentTab = tabName;
    
    // 모든 탭 비활성화
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 선택한 탭 활성화
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // 데이터 로드
    await loadCurrentTab();
}

async function loadCurrentTab() {
    switch(currentTab) {
        case 'patients':
            await loadPatients();
            break;
        case 'recipes':
            await loadRecipes();
            break;
        case 'cases':
            await loadCases();
            break;
        case 'guides':
            await loadGuides();
            break;
    }
}

// ================================================
// 환자 관리
// ================================================
async function loadPatients() {
    const listEl = document.getElementById('patientList');
    listEl.innerHTML = '<div class="loading"></div>';
    
    try {
        // users와 children 조인해서 가져오기
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select(`
                *,
                children (
                    *,
                    child_required_info (*)
                )
            `)
            .eq('role', 'parent')
            .order('created_at', { ascending: false });
        
        if (usersError) throw usersError;
        
        allPatients = users || [];
        
        if (allPatients.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-text">등록된 환자가 없습니다</div>
                    <div class="empty-state-subtext">새 환자를 추가해주세요</div>
                </div>
            `;
            return;
        }
        
        renderPatients(allPatients);
    } catch (error) {
        console.error('환자 목록 로드 실패:', error);
        listEl.innerHTML = `<div class="error">환자 목록을 불러오지 못했습니다</div>`;
    }
}

function renderPatients(patients) {
    const listEl = document.getElementById('patientList');
    
    // 필터링
    let filtered = patients;
    
    // 1. 환자 타입 필터 (병원환자/일반사용자)
    if (currentFilter === 'hospital') {
        filtered = filtered.filter(p => p.is_patient === true);
    } else if (currentFilter === 'general') {
        filtered = filtered.filter(p => p.is_patient !== true);
    }
    // currentFilter === 'all'이면 모두 표시
    
    // 2. 검색어 필터링
    const searchTerm = document.getElementById('patientSearch')?.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(searchTerm);
            const emailMatch = p.email?.toLowerCase().includes(searchTerm);
            const childMatch = p.children && p.children.some(child => 
                child.name.toLowerCase().includes(searchTerm)
            );
            return nameMatch || emailMatch || childMatch;
        });
    }
    
    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-text">검색 결과가 없습니다</div>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = filtered.map(patient => {
        const childrenCount = patient.children?.length || 0;
        const children = patient.children || [];
        
        // 병원 환자 배지
        const patientBadge = patient.is_patient 
            ? '<span class="badge badge-hospital">🏥 병원환자</span>' 
            : '<span class="badge badge-general">👤 일반사용자</span>';
        
        // 자녀 요약 정보
        const childrenSummary = children.length > 0
            ? children.map(child => {
                const age = child.birth_date ? calculateAge(child.birth_date) : '-';
                return `<span class="admin-item-badge ${child.gender}">
                    ${child.gender === 'male' ? '👦' : '👧'} ${child.name} (${age}세)
                </span>`;
            }).join(' ')
            : '<span style="color: #9ca3af;">자녀 정보 없음</span>';
        
        return `
            <div class="patient-card" onclick="showPatientDetailNew('${patient.id}')">
                <div class="patient-card-header">
                    <div class="patient-info">
                        <div class="patient-name">
                            👪 ${patient.name} ${patientBadge}
                        </div>
                        <div class="patient-contact">
                            ${patient.email ? `📧 ${patient.email}` : ''}
                            ${patient.phone ? `📞 ${patient.phone}` : ''}
                        </div>
                        <div class="patient-children">
                            👶 자녀 ${childrenCount}명: ${childrenSummary}
                        </div>
                    </div>
                    <div class="admin-item-actions">
                        <button class="btn-view" onclick="event.stopPropagation(); showPatientDetailNew('${patient.id}')">👁️ 상세보기</button>
                        <button class="btn-edit" onclick="event.stopPropagation(); editParent('${patient.id}')">✏️ 수정</button>
                        <button class="btn-delete" onclick="event.stopPropagation(); deleteParent('${patient.id}')">🗑️ 삭제</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function searchPatients() {
    renderPatients(allPatients);
}

function filterPatients(filter) {
    currentFilter = filter;
    
    // 필터 버튼 업데이트
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
    
    renderPatients(allPatients);
}

// 환자 추가 폼 표시
function showPatientForm() {
    document.getElementById('patientFormContainer').style.display = 'block';
    document.getElementById('patientForm').reset();
    document.getElementById('patient_id').value = '';
    document.getElementById('child_id').value = '';
}

function hidePatientForm() {
    document.getElementById('patientFormContainer').style.display = 'none';
}

// 환자 추가/수정 제출
async function handlePatientSubmit(e) {
    e.preventDefault();
    
    const patientId = document.getElementById('patient_id').value;
    
    const parentData = {
        name: document.getElementById('patient_name').value,
        email: document.getElementById('patient_email').value || null,
        phone: document.getElementById('patient_phone').value || null,
        role: 'parent'
    };
    
    try {
        if (patientId) {
            // 수정
            const { error } = await supabase
                .from('users')
                .update(parentData)
                .eq('id', patientId);
            
            if (error) throw error;
            
            alert('환자 정보가 수정되었습니다.');
        } else {
            // 추가
            const { error } = await supabase
                .from('users')
                .insert([parentData]);
            
            if (error) throw error;
            
            alert('환자가 추가되었습니다. 자녀 정보는 상세 페이지에서 추가할 수 있습니다.');
        }
        
        hidePatientForm();
        await loadPatients();
    } catch (error) {
        console.error('환자 저장 실패:', error);
        alert('환자 저장에 실패했습니다.');
    }
}

// 환자 수정
async function editPatient(userId, childId) {
    try {
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        const { data: child } = await supabase.from('children').select('*').eq('id', childId).single();
        const { data: childInfo } = await supabase.from('child_required_info').select('*').eq('child_id', childId).single();
        
        document.getElementById('patient_id').value = userId;
        document.getElementById('child_id').value = childId;
        document.getElementById('patient_name').value = user.name;
        document.getElementById('patient_email').value = user.email || '';
        document.getElementById('patient_phone').value = user.phone || '';
        document.getElementById('child_name').value = child.name;
        document.getElementById('child_gender').value = child.gender;
        document.getElementById('child_birth_date').value = child.birth_date;
        document.getElementById('father_height').value = childInfo?.father_height || '';
        document.getElementById('mother_height').value = childInfo?.mother_height || '';
        document.getElementById('target_height').value = childInfo?.target_height || '';
        document.getElementById('special_notes').value = childInfo?.special_notes || '';
        
        showPatientForm();
    } catch (error) {
        console.error('환자 정보 로드 실패:', error);
        showToast('환자 정보를 불러오지 못했습니다', 'error');
    }
}

// 환자 삭제
async function deletePatient(userId, childId) {
    if (!confirm('정말 이 환자를 삭제하시겠습니까? 모든 측정 기록도 함께 삭제됩니다.')) return;
    
    try {
        // CASCADE로 자동 삭제되지만 명시적으로 삭제
        await supabase.from('users').delete().eq('id', userId);
        showToast('환자가 삭제되었습니다', 'success');
        await loadPatients();
    } catch (error) {
        console.error('환자 삭제 실패:', error);
        showToast('환자 삭제에 실패했습니다', 'error');
    }
}

// 환자(부모) 상세 모달 - 새 버전 (다중 아이 지원)
async function showPatientDetailNew(userId) {
    const modal = document.getElementById('patientDetailModal');
    const body = document.getElementById('patientDetailBody');
    
    body.innerHTML = '<div class="loading"></div>';
    modal.style.display = 'block';
    
    try {
        // 부모 정보 + 자녀 목록 가져오기
        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
                *,
                children (
                    *,
                    measurements (*)
                )
            `)
            .eq('id', userId)
            .single();
        
        if (userError) throw userError;
        
        const children = user.children || [];
        
        // 각 자녀의 측정 기록을 날짜 오름차순으로 정렬
        children.forEach(child => {
            if (child.measurements && child.measurements.length > 0) {
                child.measurements.sort((a, b) => {
                    return new Date(a.measured_date) - new Date(b.measured_date);
                });
            }
        });
        
        body.innerHTML = `
            <div class="patient-detail-header">
                <h2>👪 ${user.name}</h2>
            </div>
            
            <div class="patient-detail-info">
                <div class="info-item">
                    <span class="info-label">📧 이메일:</span>
                    <span class="info-value">${user.email || '-'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">📞 전화번호:</span>
                    <span class="info-value">${user.phone || '-'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">👶 자녀 수:</span>
                    <span class="info-value">${children.length}명</span>
                </div>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <h3 style="margin: 0;">👶 자녀 목록</h3>
                <button class="btn-add-small" onclick="showAddChildForm('${userId}')">➕ 자녀 추가</button>
            </div>
            
            ${children.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon">👶</div>
                    <div class="empty-state-text">등록된 자녀가 없습니다</div>
                    <div class="empty-state-subtext">자녀 추가 버튼을 클릭하여 자녀 정보를 등록하세요</div>
                </div>
            ` : `
                <div class="children-list">
                    ${children.map(child => {
                        const age = calculateAge(child.birth_date);
                        const measurements = child.measurements || [];
                        const latestMeasurement = measurements[measurements.length - 1];
                        
                        return `
                            <div class="child-card">
                                <div class="child-card-header">
                                    <div class="child-info">
                                        <div class="child-name">
                                            ${child.gender === 'male' ? '👦' : '👧'} ${child.name}
                                            <span class="admin-item-badge ${child.gender}">
                                                ${child.gender === 'male' ? '남아' : '여아'}
                                            </span>
                                        </div>
                                        <div class="child-meta">
                                            📅 ${child.birth_date} (만 ${age}세)
                                        </div>
                                    </div>
                                    <div class="child-actions">
                                        <button class="btn-small btn-primary" onclick="showAddMeasurementForm('${child.id}')">📊 측정 추가</button>
                                        <button class="btn-small btn-edit" onclick="editChild('${child.id}')">✏️ 수정</button>
                                        <button class="btn-small btn-delete" onclick="deleteChild('${child.id}', '${userId}')">🗑️ 삭제</button>
                                    </div>
                                </div>
                                
                                ${latestMeasurement ? `
                                    <div class="child-latest-measurement">
                                        <span class="measurement-label">최근 측정 (${latestMeasurement.measured_date}):</span>
                                        <span class="measurement-value">키 ${latestMeasurement.height}cm, 몸무게 ${latestMeasurement.weight || '-'}kg</span>
                                    </div>
                                ` : ''}
                                
                                <!-- 성장 그래프 (측정 기록 위에) -->
                                ${measurements.length > 0 ? `
                                    <div class="growth-chart-container" style="margin-bottom: 24px;">
                                        <h4 style="margin-bottom: 16px; font-size: 18px; font-weight: 700; color: #1e293b;">📈 성장 곡선</h4>
                                        <div style="width: 70%; max-width: 800px; aspect-ratio: 1 / 1.5; background: white; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 0 auto;">
                                            <canvas id="growthChart_${child.id}"></canvas>
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- 📅 데일리 루틴 섹션 -->
                                <div class="child-daily-routines" style="margin-top: 32px;">
                                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                                        <h4>📅 데일리 루틴</h4>
                                        <button class="btn-small btn-primary" onclick="loadDailyRoutinesCalendar('${child.id}')">🔄 새로고침</button>
                                    </div>
                                    <div id="dailyRoutines_${child.id}" class="daily-routines-container">
                                        <p style="color: #9ca3af; font-size: 0.9rem;">데일리 루틴을 불러오는 중...</p>
                                    </div>
                                </div>
                                
                                <div class="child-measurements">
                                    <h4>📊 측정 기록 (${measurements.length}개)</h4>
                                    ${measurements.length > 0 ? `
                                        <div class="measurement-table-container">
                                            <table class="measurement-table">
                                                <thead>
                                                    <tr>
                                                        <th>날짜</th>
                                                        <th>키 (cm)</th>
                                                        <th>몸무게 (kg)</th>
                                                        <th>실제나이 (세)</th>
                                                        <th>뼈나이 (세)</th>
                                                        <th>PAH (cm)</th>
                                                        <th>메모</th>
                                                        <th>작업</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${measurements.map(m => `
                                                        <tr data-measurement-id="${m.id}">
                                                            <td class="editable" data-field="measured_date" data-type="date">${m.measured_date}</td>
                                                            <td class="editable" data-field="height" data-type="number">${m.height || '-'}</td>
                                                            <td class="editable" data-field="weight" data-type="number">${m.weight || '-'}</td>
                                                            <td class="editable" data-field="actual_age" data-type="number">${m.actual_age || '-'}</td>
                                                            <td class="editable" data-field="bone_age" data-type="number">${m.bone_age || '-'}</td>
                                                            <td class="editable" data-field="pah" data-type="number">${m.pah || '-'}</td>
                                                            <td class="editable" data-field="notes" data-type="text">${m.notes || '-'}</td>
                                                            <td>
                                                                <button class="btn-small btn-delete" onclick="deleteMeasurement('${m.id}', '${userId}')">🗑️</button>
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    ` : '<p style="color: #9ca3af; font-size: 0.9rem;">측정 기록이 없습니다</p>'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        `;
        
        // 인라인 편집 이벤트 리스너 추가
        setupInlineEditing(userId);
        
        // 각 자녀의 성장 그래프 그리기
        children.forEach(child => {
            if (child.measurements && child.measurements.length > 0) {
                setTimeout(() => {
                    drawGrowthChart(child);
                }, 100);
            }
            
            // 각 자녀의 데일리 루틴 달력 자동 로드
            setTimeout(() => {
                loadDailyRoutinesCalendar(child.id);
            }, 200);
        });
        
    } catch (error) {
        console.error('환자 상세 정보 로드 실패:', error);
        body.innerHTML = '<p class="error">환자 정보를 불러오지 못했습니다</p>';
    }
}

// 인라인 편집 설정
function setupInlineEditing(parentId) {
    const editableCells = document.querySelectorAll('.editable');
    
    editableCells.forEach(cell => {
        cell.style.cursor = 'pointer';
        cell.title = '클릭하여 수정';
        
        cell.addEventListener('click', function() {
            const currentValue = this.textContent.trim();
            const field = this.dataset.field;
            const type = this.dataset.type;
            const measurementId = this.closest('tr').dataset.measurementId;
            
            // 이미 수정 중이면 무시
            if (this.querySelector('input')) return;
            
            // input 생성 (숫자도 text로 - 직접 입력)
            const input = document.createElement('input');
            input.type = type === 'date' ? 'date' : 'text';
            input.value = currentValue === '-' ? '' : currentValue;
            input.style.width = '100%';
            input.style.padding = '6px 8px';
            input.style.border = '2px solid #667eea';
            input.style.borderRadius = '6px';
            input.style.fontSize = '14px';
            input.style.outline = 'none';
            
            // 숫자 필드면 inputmode 추가
            if (type === 'number') {
                input.inputMode = 'decimal';
            }
            
            // 원래 내용 저장
            const originalContent = this.innerHTML;
            this.innerHTML = '';
            this.appendChild(input);
            input.focus();
            input.select();
            
            // Enter로 저장
            input.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    await saveCellValue(measurementId, field, input.value, parentId);
                }
                if (e.key === 'Escape') {
                    this.innerHTML = originalContent;
                }
            });
            
            // blur로 저장
            input.addEventListener('blur', async () => {
                await saveCellValue(measurementId, field, input.value, parentId);
            });
        });
    });
}

// 셀 값 저장
async function saveCellValue(measurementId, field, value, parentId) {
    try {
        const updateData = {};
        
        // 빈 값 처리
        if (value === '' || value === '-') {
            updateData[field] = null;
        } else {
            // 타입에 따라 변환
            if (field === 'measured_date') {
                updateData[field] = value;
            } else if (field === 'notes') {
                updateData[field] = value;
            } else {
                updateData[field] = parseFloat(value);
            }
        }
        
        // age_at_measurement도 업데이트
        if (field === 'actual_age') {
            updateData['age_at_measurement'] = updateData[field];
        }
        
        const { error } = await supabase
            .from('measurements')
            .update(updateData)
            .eq('id', measurementId);
        
        if (error) throw error;
        
        // 성공 후 모달 새로고침
        showPatientDetailNew(parentId);
    } catch (error) {
        console.error('값 저장 실패:', error);
        alert('저장에 실패했습니다.');
        showPatientDetailNew(parentId);
    }
}

// 환자 상세 모달
async function showPatientDetail(userId, childId) {
    const modal = document.getElementById('patientDetailModal');
    const body = document.getElementById('patientDetailBody');
    
    body.innerHTML = '<div class="loading"></div>';
    modal.style.display = 'block';
    
    try {
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        const { data: child } = await supabase.from('children').select('*, child_required_info(*)').eq('id', childId).single();
        const { data: measurements } = await supabase
            .from('measurements')
            .select('*')
            .eq('child_id', childId)
            .order('measured_date', { ascending: true });
        
        const childInfo = child.child_required_info?.[0];
        const age = calculateAge(child.birth_date);
        
        body.innerHTML = `
            <h2>👥 ${user.name} - ${child.name}</h2>
            <div class="patient-detail-info">
                <p><strong>성별:</strong> ${child.gender === 'male' ? '남아' : '여아'}</p>
                <p><strong>생년월일:</strong> ${child.birth_date} (만 ${age}세)</p>
                <p><strong>아버지 키:</strong> ${childInfo?.father_height || '-'} cm</p>
                <p><strong>어머니 키:</strong> ${childInfo?.mother_height || '-'} cm</p>
                <p><strong>예상 최종 키:</strong> ${childInfo?.target_height || '-'} cm</p>
                ${childInfo?.special_notes ? `<p><strong>특이사항:</strong> ${childInfo.special_notes}</p>` : ''}
            </div>
            
            <h3 style="margin-top: 24px;">📊 측정 기록</h3>
            <div class="measurement-list">
                ${measurements && measurements.length > 0 ? measurements.map(m => `
                    <div class="measurement-item">
                        <div class="measurement-date">${m.measured_date}</div>
                        <div class="measurement-values">
                            <span>키: ${m.height} cm</span>
                            ${m.weight ? `<span>몸무게: ${m.weight} kg</span>` : ''}
                        </div>
                    </div>
                `).join('') : '<p>측정 기록이 없습니다</p>'}
            </div>
        `;
    } catch (error) {
        console.error('환자 상세 정보 로드 실패:', error);
        body.innerHTML = '<p class="error">환자 정보를 불러오지 못했습니다</p>';
    }
}

function closePatientDetailModal() {
    document.getElementById('patientDetailModal').style.display = 'none';
}

// ================================================
// 부모(환자) 관리 함수들
// ================================================

// 부모 수정
async function editParent(userId) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        // 폼에 기존 데이터 채우기
        document.getElementById('patient_id').value = user.id;
        document.getElementById('patient_name').value = user.name;
        document.getElementById('patient_email').value = user.email || '';
        document.getElementById('patient_phone').value = user.phone || '';
        
        // 폼 표시
        document.getElementById('patientFormContainer').style.display = 'block';
        document.getElementById('patientFormContainer').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('부모 정보 로드 실패:', error);
        alert('부모 정보를 불러오지 못했습니다.');
    }
}

// 부모 삭제
async function deleteParent(userId) {
    if (!confirm('이 환자와 모든 자녀 정보, 측정 기록이 삭제됩니다. 계속하시겠습니까?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
        
        alert('환자 정보가 삭제되었습니다.');
        await loadPatients();
    } catch (error) {
        console.error('환자 삭제 실패:', error);
        alert('환자 삭제에 실패했습니다.');
    }
}

// ================================================
// 자녀 관리 함수들
// ================================================

// 자녀 추가 폼 표시
function showAddChildForm(parentId) {
    const body = document.getElementById('patientDetailBody');
    
    // 기존 내용 위에 폼 추가
    const formHtml = `
        <div class="inline-form" id="addChildForm">
            <h3>👶 새 자녀 추가</h3>
            <form onsubmit="handleAddChild(event, '${parentId}')">
                <div class="form-group">
                    <label>이름 *</label>
                    <input type="text" id="new_child_name" placeholder="홍길순" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>성별 *</label>
                        <select id="new_child_gender" required>
                            <option value="">선택</option>
                            <option value="male">남아</option>
                            <option value="female">여아</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>생년월일 *</label>
                        <input type="date" id="new_child_birth_date" required>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">저장</button>
                    <button type="button" class="btn-secondary" onclick="hideAddChildForm('${parentId}')">취소</button>
                </div>
            </form>
        </div>
    `;
    
    body.insertAdjacentHTML('afterbegin', formHtml);
    document.getElementById('new_child_name').focus();
}

function hideAddChildForm(parentId) {
    document.getElementById('addChildForm')?.remove();
    showPatientDetailNew(parentId);
}

// 자녀 추가 처리
async function handleAddChild(event, parentId) {
    event.preventDefault();
    
    const childData = {
        parent_id: parentId,
        name: document.getElementById('new_child_name').value,
        gender: document.getElementById('new_child_gender').value,
        birth_date: document.getElementById('new_child_birth_date').value
    };
    
    try {
        const { error } = await supabase
            .from('children')
            .insert([childData]);
        
        if (error) throw error;
        
        alert('자녀 정보가 추가되었습니다.');
        showPatientDetailNew(parentId);
    } catch (error) {
        console.error('자녀 추가 실패:', error);
        alert('자녀 추가에 실패했습니다.');
    }
}

// 자녀 수정
async function editChild(childId) {
    try {
        const { data: child, error } = await supabase
            .from('children')
            .select('*')
            .eq('id', childId)
            .single();
        
        if (error) throw error;
        
        const newName = prompt('이름:', child.name);
        if (!newName) return;
        
        const newBirthDate = prompt('생년월일 (YYYY-MM-DD):', child.birth_date);
        if (!newBirthDate) return;
        
        const { error: updateError } = await supabase
            .from('children')
            .update({ name: newName, birth_date: newBirthDate })
            .eq('id', childId);
        
        if (updateError) throw updateError;
        
        alert('자녀 정보가 수정되었습니다.');
        showPatientDetailNew(child.parent_id);
    } catch (error) {
        console.error('자녀 수정 실패:', error);
        alert('자녀 정보 수정에 실패했습니다.');
    }
}

// 자녀 삭제
async function deleteChild(childId, parentId) {
    if (!confirm('이 자녀와 모든 측정 기록이 삭제됩니다. 계속하시겠습니까?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('children')
            .delete()
            .eq('id', childId);
        
        if (error) throw error;
        
        alert('자녀 정보가 삭제되었습니다.');
        showPatientDetailNew(parentId);
    } catch (error) {
        console.error('자녀 삭제 실패:', error);
        alert('자녀 삭제에 실패했습니다.');
    }
}

// ================================================
// 측정 기록 관리 함수들
// ================================================

// 측정 기록 추가 폼
function showAddMeasurementForm(childId) {
    const childCard = event.target.closest('.child-card');
    
    const formHtml = `
        <div class="inline-form measurement-form">
            <h4>📊 측정 기록 추가</h4>
            <form onsubmit="handleAddMeasurement(event, '${childId}')">
                <div class="form-row">
                    <div class="form-group">
                        <label>측정 날짜 *</label>
                        <input type="date" id="measurement_date_${childId}" required>
                    </div>
                    <div class="form-group">
                        <label>키 (cm) *</label>
                        <input type="number" step="0.1" id="measurement_height_${childId}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>몸무게 (kg)</label>
                        <input type="number" step="0.1" id="measurement_weight_${childId}">
                    </div>
                    <div class="form-group">
                        <label>BMI</label>
                        <input type="number" step="0.1" id="measurement_bmi_${childId}">
                    </div>
                </div>
                <div class="form-group">
                    <label>메모</label>
                    <textarea id="measurement_notes_${childId}" rows="2"></textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">저장</button>
                    <button type="button" class="btn-secondary" onclick="this.closest('.inline-form').remove()">취소</button>
                </div>
            </form>
        </div>
    `;
    
    // 기존 폼이 있으면 제거
    childCard.querySelector('.measurement-form')?.remove();
    childCard.querySelector('.child-measurements').insertAdjacentHTML('afterbegin', formHtml);
    document.getElementById(`measurement_date_${childId}`).focus();
}

// 측정 기록 추가 처리
async function handleAddMeasurement(event, childId) {
    event.preventDefault();
    
    const measurementData = {
        child_id: childId,
        measured_date: document.getElementById(`measurement_date_${childId}`).value,
        height: parseFloat(document.getElementById(`measurement_height_${childId}`).value),
        weight: parseFloat(document.getElementById(`measurement_weight_${childId}`).value) || null,
        bmi: parseFloat(document.getElementById(`measurement_bmi_${childId}`).value) || null,
        notes: document.getElementById(`measurement_notes_${childId}`).value || null
    };
    
    try {
        // 먼저 child의 parent_id 가져오기
        const { data: child } = await supabase
            .from('children')
            .select('parent_id')
            .eq('id', childId)
            .single();
        
        const { error } = await supabase
            .from('measurements')
            .insert([measurementData]);
        
        if (error) throw error;
        
        alert('측정 기록이 추가되었습니다.');
        showPatientDetailNew(child.parent_id);
    } catch (error) {
        console.error('측정 기록 추가 실패:', error);
        alert('측정 기록 추가에 실패했습니다.');
    }
}

// 측정 기록 삭제
async function deleteMeasurement(measurementId, parentId) {
    if (!confirm('이 측정 기록을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const { error } = await supabase
            .from('measurements')
            .delete()
            .eq('id', measurementId);
        
        if (error) throw error;
        
        alert('측정 기록이 삭제되었습니다.');
        showPatientDetailNew(parentId);
    } catch (error) {
        console.error('측정 기록 삭제 실패:', error);
        alert('측정 기록 삭제에 실패했습니다.');
    }
}

// 측정 기록 수정
async function editMeasurement(measurementId, childId, parentId) {
    try {
        // 기존 측정 기록 가져오기
        const { data: measurement, error } = await supabase
            .from('measurements')
            .select('*')
            .eq('id', measurementId)
            .single();
        
        if (error) throw error;
        
        // 프롬프트로 수정
        const date = prompt('측정 날짜 (YYYY-MM-DD):', measurement.measured_date);
        if (!date) return;
        
        const height = prompt('키 (cm):', measurement.height);
        if (!height) return;
        
        const weight = prompt('몸무게 (kg):', measurement.weight || '');
        const boneAge = prompt('뼈나이 (세):', measurement.bone_age || '');
        const actualAge = prompt('실제나이 (세):', measurement.actual_age || '');
        const pah = prompt('PAH (cm):', measurement.pah || '');
        const notes = prompt('메모:', measurement.notes || '');
        
        // 업데이트
        const updateData = {
            measured_date: date,
            height: parseFloat(height),
            weight: weight ? parseFloat(weight) : null,
            bone_age: boneAge ? parseFloat(boneAge) : null,
            actual_age: actualAge ? parseFloat(actualAge) : null,
            age_at_measurement: actualAge ? parseFloat(actualAge) : measurement.age_at_measurement,
            pah: pah ? parseFloat(pah) : null,
            notes: notes || null
        };
        
        const { error: updateError } = await supabase
            .from('measurements')
            .update(updateData)
            .eq('id', measurementId);
        
        if (updateError) throw updateError;
        
        alert('✅ 측정 기록이 수정되었습니다.');
        showPatientDetailNew(parentId);
    } catch (error) {
        console.error('측정 기록 수정 실패:', error);
        alert('❌ 측정 기록 수정에 실패했습니다.');
    }
}

function closePatientDetailModal() {
    document.getElementById('patientDetailModal').style.display = 'none';
}

// ================================================
// 레시피 관리
// ================================================
async function loadRecipes() {
    const listEl = document.getElementById('recipeList');
    listEl.innerHTML = '<div class="loading"></div>';
    
    try {
        const { recipes } = await getRecipes(100);
        allRecipes = recipes;
        
        if (allRecipes.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🍳</div>
                    <div class="empty-state-text">등록된 레시피가 없습니다</div>
                </div>
            `;
            return;
        }
        
        listEl.innerHTML = allRecipes.map(recipe => `
            <div class="admin-item">
                <div class="admin-item-header">
                    <div class="admin-item-title">${recipe.recipe_number}. ${recipe.title}</div>
                    <div class="admin-item-actions">
                        <button class="btn-edit" onclick="editRecipe('${recipe.id}')">수정</button>
                        <button class="btn-delete" onclick="deleteRecipeItem('${recipe.id}')">삭제</button>
                    </div>
                </div>
                <div class="admin-item-content">
                    ${recipe.key_benefits}
                </div>
                <div class="admin-item-meta">
                    <span>순서: ${recipe.order_index}</span>
                    <span>영양소: ${recipe.main_nutrients.join(', ')}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('레시피 로드 실패:', error);
        listEl.innerHTML = `<div class="error">레시피를 불러오지 못했습니다</div>`;
    }
}

function showRecipeForm() {
    document.getElementById('recipeFormContainer').style.display = 'block';
    document.getElementById('recipeForm').reset();
    document.getElementById('recipe_id').value = '';
}

function hideRecipeForm() {
    document.getElementById('recipeFormContainer').style.display = 'none';
}

async function handleRecipeSubmit(e) {
    e.preventDefault();
    
    const recipeId = document.getElementById('recipe_id').value;
    
    try {
        const recipeData = {
            recipe_number: document.getElementById('recipe_number').value,
            order_index: parseInt(document.getElementById('recipe_order').value),
            title: document.getElementById('recipe_title').value,
            image_url: document.getElementById('recipe_image_url').value,
            key_benefits: document.getElementById('recipe_key_benefits').value,
            main_nutrients: document.getElementById('recipe_main_nutrients').value.split(',').map(s => s.trim()),
            ingredients: JSON.parse(document.getElementById('recipe_ingredients').value),
            steps: JSON.parse(document.getElementById('recipe_steps').value),
            tips: document.getElementById('recipe_tips').value ? document.getElementById('recipe_tips').value.split(',').map(s => s.trim()) : [],
            growth_info: document.getElementById('recipe_growth_info').value ? JSON.parse(document.getElementById('recipe_growth_info').value) : null
        };
        
        if (recipeId) {
            await updateRecipe(recipeId, recipeData);
            showToast('레시피가 수정되었습니다', 'success');
        } else {
            await createRecipe(recipeData);
            showToast('레시피가 추가되었습니다', 'success');
        }
        
        hideRecipeForm();
        await loadRecipes();
    } catch (error) {
        console.error('레시피 저장 실패:', error);
        showToast('레시피 저장에 실패했습니다. JSON 형식을 확인하세요', 'error');
    }
}

async function editRecipe(id) {
    const recipe = await getRecipe(id);
    if (!recipe) return;
    
    document.getElementById('recipe_id').value = id;
    document.getElementById('recipe_number').value = recipe.recipe_number;
    document.getElementById('recipe_order').value = recipe.order_index;
    document.getElementById('recipe_title').value = recipe.title;
    document.getElementById('recipe_image_url').value = recipe.image_url;
    document.getElementById('recipe_key_benefits').value = recipe.key_benefits;
    document.getElementById('recipe_main_nutrients').value = recipe.main_nutrients.join(', ');
    document.getElementById('recipe_ingredients').value = JSON.stringify(recipe.ingredients, null, 2);
    document.getElementById('recipe_steps').value = JSON.stringify(recipe.steps, null, 2);
    document.getElementById('recipe_tips').value = recipe.tips ? recipe.tips.join(', ') : '';
    document.getElementById('recipe_growth_info').value = recipe.growth_info ? JSON.stringify(recipe.growth_info, null, 2) : '';
    
    showRecipeForm();
}

async function deleteRecipeItem(id) {
    if (!confirm('정말 이 레시피를 삭제하시겠습니까?')) return;
    
    const result = await deleteRecipe(id);
    if (result.success) {
        showToast('레시피가 삭제되었습니다', 'success');
        await loadRecipes();
    } else {
        showToast('레시피 삭제에 실패했습니다', 'error');
    }
}

// ================================================
// 사례 관리
// ================================================
async function loadCases() {
    const listEl = document.getElementById('caseList');
    listEl.innerHTML = '<div class="loading"></div>';
    
    try {
        const { cases } = await getGrowthCases(100);
        allCases = cases;
        
        if (allCases.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🌟</div>
                    <div class="empty-state-text">등록된 사례가 없습니다</div>
                </div>
            `;
            return;
        }
        
        listEl.innerHTML = allCases.map(caseItem => {
            const measurements = caseItem.measurements || [];
            const firstMeasurement = measurements[0];
            const lastMeasurement = measurements[measurements.length - 1];
            const growth = lastMeasurement && firstMeasurement ? 
                (lastMeasurement.height - firstMeasurement.height).toFixed(1) : '-';
            
            return `
                <div class="admin-item">
                    <div class="admin-item-header">
                        <div class="admin-item-title">
                            <span class="admin-item-badge ${caseItem.gender}">
                                ${caseItem.gender === 'male' ? '👦' : '👧'}
                            </span>
                            ${caseItem.patient_name}
                        </div>
                        <div class="admin-item-actions">
                            <button class="btn-edit" onclick="editCase('${caseItem.id}')">수정</button>
                            <button class="btn-delete" onclick="deleteCaseItem('${caseItem.id}')">삭제</button>
                        </div>
                    </div>
                    <div class="admin-item-content">
                        ${caseItem.treatment_memo || ''}
                    </div>
                    <div class="admin-item-meta">
                        <span>측정 ${measurements.length}회</span>
                        <span>성장 ${growth} cm</span>
                        ${caseItem.order_index ? `<span>순서: ${caseItem.order_index}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('사례 로드 실패:', error);
        listEl.innerHTML = `<div class="error">사례를 불러오지 못했습니다</div>`;
    }
}

function showCaseForm() {
    document.getElementById('caseFormContainer').style.display = 'block';
    document.getElementById('caseForm').reset();
    document.getElementById('case_id').value = '';
}

function hideCaseForm() {
    document.getElementById('caseFormContainer').style.display = 'none';
}

async function handleCaseSubmit(e) {
    e.preventDefault();
    
    const caseId = document.getElementById('case_id').value;
    
    try {
        const caseData = {
            patient_name: document.getElementById('case_patient_name').value,
            gender: document.getElementById('case_gender').value,
            birth_date: document.getElementById('case_birth_date').value,
            father_height: parseFloat(document.getElementById('case_father_height').value) || null,
            mother_height: parseFloat(document.getElementById('case_mother_height').value) || null,
            target_height: parseFloat(document.getElementById('case_target_height').value) || null,
            special_notes: document.getElementById('case_special_notes').value || null,
            treatment_memo: document.getElementById('case_treatment_memo').value || null,
            measurements: JSON.parse(document.getElementById('case_measurements').value),
            order_index: parseInt(document.getElementById('case_order').value) || null
        };
        
        if (caseId) {
            await updateGrowthCase(caseId, caseData);
            showToast('사례가 수정되었습니다', 'success');
        } else {
            await createGrowthCase(caseData);
            showToast('사례가 추가되었습니다', 'success');
        }
        
        hideCaseForm();
        await loadCases();
    } catch (error) {
        console.error('사례 저장 실패:', error);
        showToast('사례 저장에 실패했습니다. JSON 형식을 확인하세요', 'error');
    }
}

async function editCase(id) {
    const caseItem = await getGrowthCase(id);
    if (!caseItem) return;
    
    document.getElementById('case_id').value = id;
    document.getElementById('case_patient_name').value = caseItem.patient_name;
    document.getElementById('case_gender').value = caseItem.gender;
    document.getElementById('case_birth_date').value = caseItem.birth_date;
    document.getElementById('case_father_height').value = caseItem.father_height || '';
    document.getElementById('case_mother_height').value = caseItem.mother_height || '';
    document.getElementById('case_target_height').value = caseItem.target_height || '';
    document.getElementById('case_special_notes').value = caseItem.special_notes || '';
    document.getElementById('case_treatment_memo').value = caseItem.treatment_memo || '';
    document.getElementById('case_measurements').value = JSON.stringify(caseItem.measurements, null, 2);
    document.getElementById('case_order').value = caseItem.order_index || '';
    
    showCaseForm();
}

async function deleteCaseItem(id) {
    if (!confirm('정말 이 사례를 삭제하시겠습니까?')) return;
    
    const result = await deleteGrowthCase(id);
    if (result.success) {
        showToast('사례가 삭제되었습니다', 'success');
        await loadCases();
    } else {
        showToast('사례 삭제에 실패했습니다', 'error');
    }
}

// ================================================
// 가이드 관리
// ================================================
async function loadGuides() {
    const listEl = document.getElementById('guideList');
    listEl.innerHTML = '<div class="loading"></div>';
    
    try {
        const { guides } = await getGrowthGuides(100);
        allGuides = guides;
        
        if (allGuides.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <div class="empty-state-text">등록된 가이드가 없습니다</div>
                </div>
            `;
            return;
        }
        
        listEl.innerHTML = allGuides.map(guide => `
            <div class="admin-item">
                <div class="admin-item-header">
                    <div class="admin-item-title">
                        ${guide.icon || '📖'} ${guide.title}
                    </div>
                    <div class="admin-item-actions">
                        <button class="btn-edit" onclick="editGuide('${guide.id}')">수정</button>
                        <button class="btn-delete" onclick="deleteGuideItem('${guide.id}')">삭제</button>
                    </div>
                </div>
                <div class="admin-item-content">
                    ${guide.subtitle || ''}
                </div>
                <div class="admin-item-meta">
                    <span>순서: ${guide.order_index}</span>
                    ${guide.category ? `<span>카테고리: ${guide.category}</span>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('가이드 로드 실패:', error);
        listEl.innerHTML = `<div class="error">가이드를 불러오지 못했습니다</div>`;
    }
}

function showGuideForm() {
    document.getElementById('guideFormContainer').style.display = 'block';
    document.getElementById('guideForm').reset();
    document.getElementById('guide_id').value = '';
}

function hideGuideForm() {
    document.getElementById('guideFormContainer').style.display = 'none';
}

async function handleGuideSubmit(e) {
    e.preventDefault();
    
    const guideId = document.getElementById('guide_id').value;
    
    try {
        const guideData = {
            title: document.getElementById('guide_title').value,
            subtitle: document.getElementById('guide_subtitle').value || null,
            icon: document.getElementById('guide_icon').value || null,
            image_url: document.getElementById('guide_image_url').value || null,
            content: document.getElementById('guide_content').value,
            category: document.getElementById('guide_category').value || null,
            banner_color: document.getElementById('guide_banner_color').value || null,
            order_index: parseInt(document.getElementById('guide_order').value)
        };
        
        if (guideId) {
            await updateGrowthGuide(guideId, guideData);
            showToast('가이드가 수정되었습니다', 'success');
        } else {
            await createGrowthGuide(guideData);
            showToast('가이드가 추가되었습니다', 'success');
        }
        
        hideGuideForm();
        await loadGuides();
    } catch (error) {
        console.error('가이드 저장 실패:', error);
        showToast('가이드 저장에 실패했습니다', 'error');
    }
}

async function editGuide(id) {
    const { data: guide, error } = await supabase
        .from('growth_guides')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error || !guide) return;
    
    document.getElementById('guide_id').value = id;
    document.getElementById('guide_title').value = guide.title;
    document.getElementById('guide_subtitle').value = guide.subtitle || '';
    document.getElementById('guide_icon').value = guide.icon || '';
    document.getElementById('guide_image_url').value = guide.image_url || '';
    document.getElementById('guide_content').value = guide.content;
    document.getElementById('guide_category').value = guide.category || '';
    document.getElementById('guide_banner_color').value = guide.banner_color || '';
    document.getElementById('guide_order').value = guide.order_index;
    
    showGuideForm();
}

async function deleteGuideItem(id) {
    if (!confirm('정말 이 가이드를 삭제하시겠습니까?')) return;
    
    const result = await deleteGrowthGuide(id);
    if (result.success) {
        showToast('가이드가 삭제되었습니다', 'success');
        await loadGuides();
    } else {
        showToast('가이드 삭제에 실패했습니다', 'error');
    }
}

// ================================================
// 폼 이벤트 리스너 설정
// ================================================
function setupFormListeners() {
    // 환자 폼
    document.getElementById('patientForm')?.addEventListener('submit', handlePatientSubmit);
    
    // 레시피 폼
    document.getElementById('recipeForm')?.addEventListener('submit', handleRecipeSubmit);
    
    // 사례 폼
    document.getElementById('caseForm')?.addEventListener('submit', handleCaseSubmit);
    
    // 가이드 폼
    document.getElementById('guideForm')?.addEventListener('submit', handleGuideSubmit);
}

// ================================================
// 환자 추가 모달
// ================================================
function showPatientFormModal() {
    const modal = document.getElementById('patientFormModal');
    const form = document.getElementById('patientForm');
    
    // 폼 초기화
    form.reset();
    document.getElementById('patient_id').value = '';
    document.getElementById('patient_password').value = '1234'; // 기본 비밀번호
    
    // 모달 표시
    modal.style.display = 'flex';
}

function closePatientFormModal() {
    const modal = document.getElementById('patientFormModal');
    modal.style.display = 'none';
}

async function handlePatientSubmit(e) {
    e.preventDefault();
    
    const patientId = document.getElementById('patient_id').value;
    
    try {
        const patientData = {
            name: document.getElementById('patient_name').value,
            email: document.getElementById('patient_email').value,
            phone: document.getElementById('patient_phone').value || null,
            password: document.getElementById('patient_password').value,
            role: 'parent',
            memo: document.getElementById('patient_memo').value || null
        };
        
        if (patientId) {
            // 수정
            const { data, error } = await supabase
                .from('users')
                .update(patientData)
                .eq('id', patientId)
                .select();
            
            if (error) throw error;
            
            alert('환자 정보가 수정되었습니다.');
        } else {
            // 추가
            const { data, error } = await supabase
                .from('users')
                .insert([patientData])
                .select();
            
            if (error) throw error;
            
            alert('환자가 추가되었습니다.');
        }
        
        closePatientFormModal();
        await loadPatients();
    } catch (error) {
        console.error('환자 저장 실패:', error);
        alert('환자 저장에 실패했습니다: ' + error.message);
    }
}

// ================================================
// 유틸리티 함수
// ================================================
function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

console.log('✅ 관리자 페이지 스크립트 로드 완료');

// ================================================
// 성장 그래프
// ================================================

// 성장 그래프 그리기
function drawGrowthChart(child) {
    const canvasId = `growthChart_${child.id}`;
    const canvas = document.getElementById(canvasId);
    
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // 환자 데이터
    const patientData = child.measurements
        .filter(m => m.actual_age && m.height)
        .map(m => ({
            x: parseFloat(m.actual_age),
            y: parseFloat(m.height)
        }))
        .sort((a, b) => a.x - b.x);
    
    // 표준 성장 곡선 데이터
    const standardData = getStandardGrowthData(child.gender);
    
    // 차트 생성
    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                ...standardData,
                {
                    label: `${child.name}의 성장 기록`,
                    data: patientData,
                    borderColor: '#e53e3e',
                    backgroundColor: '#e53e3e',
                    pointBackgroundColor: '#e53e3e',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    borderWidth: 3,
                    tension: 0.4,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        },
                        padding: 10
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}cm (만 ${context.parsed.x}세)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: '만 나이 (세)',
                        font: {
                            size: 13,
                            weight: 600
                        }
                    },
                    min: 2,
                    max: 18,
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '키 (cm)',
                        font: {
                            size: 13,
                            weight: 600
                        }
                    },
                    min: 80,
                    max: 190,
                    ticks: {
                        stepSize: 10
                    }
                }
            }
        }
    });
}

// 표준 성장 곡선 데이터
function getStandardGrowthData(gender) {
    const ages = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    
    const maleData = {
        P5: [82, 88, 94, 100, 106, 112, 118, 124, 129, 133, 138, 145, 153, 161, 167, 171, 173],
        P50: [86, 93, 99, 106, 113, 120, 126, 132, 137, 142, 148, 156, 164, 170, 174, 176, 177],
        P95: [90, 97, 104, 111, 118, 126, 133, 140, 145, 151, 158, 167, 175, 179, 181, 182, 183]
    };
    
    const femaleData = {
        P5: [81, 87, 93, 99, 105, 111, 117, 123, 129, 135, 141, 147, 151, 154, 156, 157, 157],
        P50: [85, 92, 98, 105, 112, 119, 125, 131, 137, 143, 149, 154, 158, 160, 161, 162, 162],
        P95: [89, 96, 103, 110, 118, 126, 133, 139, 145, 151, 157, 161, 164, 166, 167, 167, 167]
    };
    
    const data = gender === 'male' ? maleData : femaleData;
    
    return [
        {
            label: '5th 백분위',
            data: ages.map((age, i) => ({ x: age, y: data.P5[i] })),
            borderColor: '#93c5fd',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            order: 100,
            fill: false
        },
        {
            label: '50th 백분위',
            data: ages.map((age, i) => ({ x: age, y: data.P50[i] })),
            borderColor: '#3b82f6',
            borderDash: [3, 3],
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.4,
            order: 99,
            fill: false
        },
        {
            label: '95th 백분위',
            data: ages.map((age, i) => ({ x: age, y: data.P95[i] })),
            borderColor: '#60a5fa',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            order: 98,
            fill: false
        }
    ];
}

