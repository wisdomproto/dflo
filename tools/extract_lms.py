import openpyxl
import json
from pathlib import Path

def extract_lms_data():
    """엑셀 파일에서 LMS 데이터를 추출하여 JSON으로 변환"""
    
    # 엑셀 파일 로드
    file_path = Path('tools/growth_data_original.xls')
    
    try:
        # xlrd를 사용하여 .xls 파일 읽기 시도
        import xlrd
        workbook = xlrd.open_workbook(file_path)
        
        result = {
            "metadata": {
                "source": "대한소아과학회 2017 한국 소아청소년 성장도표",
                "method": "LMS",
                "description": "Lambda-Mu-Sigma 방법을 사용한 한국 표준 성장 데이터",
                "ageUnit": "years",
                "heightUnit": "cm",
                "weightUnit": "kg"
            },
            "male": {
                "height": [],
                "weight": []
            },
            "female": {
                "height": [],
                "weight": []
            }
        }
        
        print(f"📂 시트 목록: {workbook.sheet_names()}")
        
        for sheet_name in workbook.sheet_names():
            sheet = workbook.sheet_by_name(sheet_name)
            print(f"\n🔍 분석 중: {sheet_name}")
            
            # 성별 판단
            gender = None
            if '남' in sheet_name or 'boy' in sheet_name.lower() or 'male' in sheet_name.lower():
                gender = 'male'
            elif '여' in sheet_name or 'girl' in sheet_name.lower() or 'female' in sheet_name.lower():
                gender = 'female'
            else:
                print(f"  ⏭️  성별 불명 - 스킵")
                continue
                
            # 유형 판단
            data_type = None
            if '신장' in sheet_name or '키' in sheet_name or 'height' in sheet_name.lower():
                data_type = 'height'
            elif '체중' in sheet_name or '몸무게' in sheet_name or 'weight' in sheet_name.lower():
                data_type = 'weight'
            else:
                print(f"  ⏭️  유형 불명 - 스킵")
                continue
                
            # 헤더 분석
            header = [str(sheet.cell_value(0, col)).lower().strip() for col in range(sheet.ncols)]
            
            # LMS 컬럼 찾기
            age_col, l_col, m_col, s_col = -1, -1, -1, -1
            
            for i, h in enumerate(header):
                if 'age' in h or 'month' in h or '나이' in h or '개월' in h:
                    age_col = i
                elif h == 'l' or 'lambda' in h:
                    l_col = i
                elif h == 'm' or 'mu' in h:
                    m_col = i
                elif h == 's' or 'sigma' in h:
                    s_col = i
            
            # 패턴으로 찾기
            if l_col == -1 or m_col == -1 or s_col == -1:
                if sheet.nrows > 1:
                    for i in range(sheet.ncols - 2):
                        try:
                            v1 = sheet.cell_value(1, i)
                            v2 = sheet.cell_value(1, i+1)
                            v3 = sheet.cell_value(1, i+2)
                            
                            if (isinstance(v1, (int, float)) and isinstance(v2, (int, float)) and isinstance(v3, (int, float))):
                                if abs(v1) <= 3 and v2 > 3 and 0.001 < v3 < 1:
                                    l_col, m_col, s_col = i, i+1, i+2
                                    break
                        except:
                            continue
            
            if l_col == -1 or m_col == -1 or s_col == -1:
                print(f"  ❌ LMS 컬럼을 찾을 수 없음")
                continue
                
            print(f"  ✅ LMS 컬럼: age={age_col}, L={l_col}, M={m_col}, S={s_col}")
            
            # 데이터 추출
            data_list = []
            for row in range(1, sheet.nrows):
                try:
                    age = sheet.cell_value(row, age_col) if age_col >= 0 else None
                    L = sheet.cell_value(row, l_col)
                    M = sheet.cell_value(row, m_col)
                    S = sheet.cell_value(row, s_col)
                    
                    # 유효성 검사
                    if not all(isinstance(x, (int, float)) for x in [L, M, S]):
                        continue
                        
                    # 범위 검사
                    if data_type == 'height' and not (40 < M < 200):
                        continue
                    if data_type == 'weight' and not (2 < M < 100):
                        continue
                    if abs(S) > 1 or abs(L) > 5:
                        continue
                        
                    # 나이 처리
                    if isinstance(age, (int, float)):
                        if age > 18:
                            age = age / 12  # 개월 → 년
                    else:
                        continue
                        
                    if not (0 <= age <= 20):
                        continue
                        
                    data_list.append({
                        "age": round(age, 2),
                        "L": round(L, 4),
                        "M": round(M, 1),
                        "S": round(S, 4)
                    })
                    
                except Exception as e:
                    continue
            
            # 정렬 및 중복 제거
            data_list.sort(key=lambda x: x['age'])
            unique_data = []
            last_age = -1
            for item in data_list:
                if item['age'] != last_age:
                    unique_data.append(item)
                    last_age = item['age']
            
            result[gender][data_type] = unique_data
            print(f"  📊 추출 완료: {len(unique_data)}개 데이터")
        
        # JSON 저장
        output_path = Path('data/korea_growth_standard.json')
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ 완료! {output_path}에 저장되었습니다.")
        print(f"\n📊 요약:")
        print(f"  남아 신장: {len(result['male']['height'])}개")
        print(f"  남아 체중: {len(result['male']['weight'])}개")
        print(f"  여아 신장: {len(result['female']['height'])}개")
        print(f"  여아 체중: {len(result['female']['weight'])}개")
        
        return result
        
    except ImportError:
        print("❌ xlrd 패키지가 필요합니다: pip install xlrd")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    extract_lms_data()
