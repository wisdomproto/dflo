# -*- coding: utf-8 -*-
"""Parse the treatment case xlsx into JSON keyed on patient."""
import pandas as pd
import re
import json
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def parse_ba(s):
    if pd.isna(s):
        return None
    m = re.match(r"(\d+)\s*세\s*(\d+)?\s*개월?", str(s))
    if not m:
        try:
            return float(str(s))
        except Exception:
            return None
    yr = int(m.group(1))
    mo = int(m.group(2)) if m.group(2) else 0
    return round(yr + mo / 12, 2)


def to_num(v):
    if pd.isna(v):
        return None
    s = str(v).replace("?", "").replace("(", "").replace(")", "").strip()
    try:
        n = float(s)
    except Exception:
        return None
    # Unrealistic heights (>220cm) likely come from data-entry concatenation
    # like "173→176" losing the arrow; drop those.
    if n > 220:
        return None
    return n


def to_date(v):
    if pd.isna(v):
        return None
    if hasattr(v, "strftime"):
        return v.strftime("%Y-%m-%d")
    return str(v)[:10]


def to_str(v):
    if pd.isna(v):
        return None
    return str(v).strip()


df = pd.read_excel(
    "치료 후기 케이스 정리 (정리완료).xlsx", sheet_name="정리된 케이스"
)
df["성함"] = df["성함"].ffill()

patients = []
for name, group in df.groupby("성함", sort=False):
    first = group.iloc[0]
    visits = []
    for _, row in group.iterrows():
        if pd.isna(row["날짜"]):
            continue
        visits.append(
            {
                "date": to_date(row["날짜"]),
                "height": to_num(row["키(cm)"]),
                "weight": to_num(row["몸무게(kg)"]),
                "bone_age": parse_ba(row["뼈나이"]),
                "pah": to_num(row["뼈예상키 (THT/PAH)"]),
                "memo1": to_str(row["치료 메모1"]),
                "memo2": to_str(row["치료 메모2"]),
            }
        )
    patients.append(
        {
            "name": str(name),
            "alias": to_str(first["가명"]),
            "gender": str(first["성별"]),
            "birth_date": to_date(first["생년월일"]),
            "father_height": to_num(first["아빠 키"]),
            "mother_height": to_num(first["엄마 키"]),
            "desired_height": to_num(first["목표키 (THT)"]),
            "chart_number": (
                str(int(first["차트번호"])) if pd.notna(first["차트번호"]) else None
            ),
            "category": to_str(first["카테고리"]),
            "review": to_str(first["치료 후기"]),
            "youtube": to_str(first["유투브 링크"]),
            "visits": visits,
        }
    )

print(json.dumps(patients, ensure_ascii=False, indent=2))
