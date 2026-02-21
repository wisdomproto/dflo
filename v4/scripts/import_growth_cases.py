"""
연세새봄의원 성장치료 데이터 Excel -> growth_cases JSON 변환 스크립트
- Excel 파일을 읽어 환자별 데이터 파싱
- 키/몸무게 없는 경우 선형 보간법으로 보정
- 환자 이름 익명화: 차트번호로 대체
- Supabase growth_cases 테이블에 넣을 JSON 파일 생성
"""

import openpyxl
import json
import sys
import io
from datetime import datetime, date

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EXCEL_PATH = r'C:\Users\101024\OneDrive\1. projects (new)\1. SB HC\5. 성장앱\1. 환자 데이터\연세새봄의원_260121.xlsx'
OUTPUT_PATH = r'C:\projects\dflo_0.1\v4\scripts\growth_cases_import.json'


def safe_float(val):
    """문자열/숫자를 float로 변환. '175~180' 같은 범위는 평균값 반환."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if not s or s == '-' or s == 'None':
        return None
    # '175~180' -> (175+180)/2 = 177.5
    if '~' in s:
        parts = s.split('~')
        try:
            nums = [float(p.strip()) for p in parts if p.strip()]
            return round(sum(nums) / len(nums), 1)
        except ValueError:
            return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_excel():
    """Excel 파일을 환자별 데이터로 파싱"""
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active

    patients = []
    current = None

    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        parent_id = row[0]
        chart_no = row[1]
        name = row[2]
        birth_date = row[3]
        gender = row[4]
        father_h = row[5]
        mother_h = row[6]
        target_h = row[7]
        consult_memo = row[8]
        meas_date = row[9]
        height = row[10]
        weight = row[11]
        real_age = row[12]
        bone_age = row[13]
        pah = row[14]
        treat_memo1 = row[15]
        treat_memo2 = row[16]

        # New patient row (부모 ID 가 있으면 새 환자)
        if parent_id is not None:
            # 익명화: 실명 대신 차트번호를 patient_name으로 사용
            anon_name = str(chart_no) if chart_no else f"CASE-{parent_id}"
            current = {
                'parent_id': parent_id,
                'chart_no': chart_no,
                'patient_name': anon_name,
                'birth_date': birth_date.strftime('%Y-%m-%d') if isinstance(birth_date, (datetime, date)) else str(birth_date),
                'gender': 'male' if gender == 'M' else 'female',
                'father_height': safe_float(father_h),
                'mother_height': safe_float(mother_h),
                'target_height': safe_float(target_h),
                'special_notes': str(consult_memo).strip() if consult_memo else None,
                'measurements': [],
            }
            patients.append(current)

        # Measurement row (날짜가 있으면 측정 데이터)
        if current and meas_date is not None:
            meas = {
                'date': meas_date.strftime('%Y-%m-%d') if isinstance(meas_date, (datetime, date)) else str(meas_date),
                'height': safe_float(height),
                'weight': safe_float(weight),
                'age': str(real_age).strip() if real_age else None,
                'bone_age': str(bone_age).strip() if bone_age else None,
                'pah': str(pah).strip() if pah else None,
            }

            # Combine treatment memos
            notes_parts = []
            if treat_memo1:
                notes_parts.append(str(treat_memo1).strip())
            if treat_memo2:
                notes_parts.append(str(treat_memo2).strip())
            meas['notes'] = ' / '.join(notes_parts) if notes_parts else None

            current['measurements'].append(meas)

    return patients


def interpolate_missing(measurements):
    """선형 보간법으로 키/몸무게 채우기"""

    def interpolate_field(meas_list, field):
        """주어진 필드의 None 값을 선형 보간으로 채움"""
        n = len(meas_list)
        if n < 2:
            return

        # date를 timestamp로 변환 (보간 기준)
        dates = []
        for m in meas_list:
            d = datetime.strptime(m['date'], '%Y-%m-%d')
            dates.append(d.timestamp())

        # 각 None 값에 대해 앞/뒤 유효값을 찾아 보간
        for i in range(n):
            if meas_list[i][field] is not None:
                continue

            # 이전 유효값 찾기
            prev_idx = None
            for j in range(i - 1, -1, -1):
                if meas_list[j][field] is not None:
                    prev_idx = j
                    break

            # 다음 유효값 찾기
            next_idx = None
            for j in range(i + 1, n):
                if meas_list[j][field] is not None:
                    next_idx = j
                    break

            if prev_idx is not None and next_idx is not None:
                # 양쪽 데이터 있음 -> 선형 보간
                t = (dates[i] - dates[prev_idx]) / (dates[next_idx] - dates[prev_idx])
                val = meas_list[prev_idx][field] + t * (meas_list[next_idx][field] - meas_list[prev_idx][field])
                meas_list[i][field] = round(val, 1)
            elif prev_idx is not None:
                # 앞에만 데이터 있음 -> 마지막 값 사용
                meas_list[i][field] = meas_list[prev_idx][field]
            elif next_idx is not None:
                # 뒤에만 데이터 있음 -> 첫 값 사용
                meas_list[i][field] = meas_list[next_idx][field]

    interpolate_field(measurements, 'height')
    interpolate_field(measurements, 'weight')

    return measurements


def build_growth_cases(patients):
    """growth_cases 테이블에 넣을 형태로 변환"""
    cases = []

    for idx, p in enumerate(patients):
        # 보간법 적용
        measurements = interpolate_missing(p['measurements'])

        # CaseMeasurement 형태로 정리
        clean_measurements = []
        for m in measurements:
            cm = {
                'date': m['date'],
                'height': m['height'],
            }
            if m['weight'] is not None:
                cm['weight'] = m['weight']
            if m['age']:
                cm['age'] = m['age']
            if m['bone_age']:
                cm['bone_age'] = m['bone_age']
            if m['pah']:
                cm['pah'] = m['pah']
            if m['notes']:
                cm['notes'] = m['notes']
            clean_measurements.append(cm)

        # treatment_memo: special_notes에 이미 포함
        case = {
            'patient_name': p['patient_name'],
            'gender': p['gender'],
            'birth_date': p['birth_date'],
            'father_height': p['father_height'],
            'mother_height': p['mother_height'],
            'target_height': p['target_height'],
            'special_notes': p['special_notes'],
            'measurements': clean_measurements,
            'is_published': True,
            'order_index': idx + 1,
        }
        cases.append(case)

    return cases


def main():
    print("=== 엑셀 파일 읽기 ===")
    patients = parse_excel()
    print(f"총 환자 수: {len(patients)}")

    total_meas = sum(len(p['measurements']) for p in patients)
    print(f"총 측정 데이터: {total_meas}")

    # 보간 전 통계
    missing_h = sum(1 for p in patients for m in p['measurements'] if m['height'] is None)
    missing_w = sum(1 for p in patients for m in p['measurements'] if m['weight'] is None)
    print(f"보간 전 - 키 누락: {missing_h}, 몸무게 누락: {missing_w}")

    print("\n=== 보간법 적용 및 JSON 생성 ===")
    cases = build_growth_cases(patients)

    # 보간 후 통계
    still_missing_h = sum(1 for c in cases for m in c['measurements'] if m.get('height') is None)
    still_missing_w = sum(1 for c in cases for m in c['measurements'] if m.get('weight') is None)
    print(f"보간 후 - 키 누락: {still_missing_h}, 몸무게 누락: {still_missing_w}")

    # JSON 저장
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(cases, f, ensure_ascii=False, indent=2)
    print(f"\n파일 저장 완료: {OUTPUT_PATH}")

    # 환자 목록 출력
    print("\n=== 환자 목록 ===")
    for i, c in enumerate(cases):
        g = 'M' if c['gender'] == 'male' else 'F'
        n_meas = len(c['measurements'])
        first_date = c['measurements'][0]['date'] if n_meas > 0 else '-'
        last_date = c['measurements'][-1]['date'] if n_meas > 0 else '-'
        print(f"{i+1:2d}. {c['patient_name']:6s} ({g}) born={c['birth_date']} meas={n_meas:2d} | {first_date} ~ {last_date}")


if __name__ == '__main__':
    main()
