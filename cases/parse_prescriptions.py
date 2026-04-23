# Parse eone prescription CSV (UTF-16 tab-delimited) and classify codes.
#
# Output:
#   cases/_prescription_codes.json  – every unique code with classification
#   cases/_prescription_rows.json   – filtered rows (medicine/procedure only)
#
# Classification rules:
#   LAB       – code matches ^(b\d|c\d|cx\d|cy\d) or name contains lab keywords
#   ADMIN     – code matches ^(AA|AL|KK) or name contains 진찰료/관리료/판독료/교육/상담
#   FOLLOWUP  – code == FU
#   MEDICINE  – everything else (medicines, supplements, injections, procedures)

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

CSV_PATH = Path(__file__).parent / "처방데이터.csv"
OUT_CODES = Path(__file__).parent / "_prescription_codes.json"
OUT_ROWS = Path(__file__).parent / "_prescription_rows.json"

LAB_CODE_RE = re.compile(r"^(b\d|c\d|cx\d|cy\d|d\d)", re.IGNORECASE)
ADMIN_CODE_RE = re.compile(r"^(AA|AL|KK|AH|IC)\d", re.IGNORECASE)
# X-ray film order codes (capital/lowercase G prefixed + 4 digits, or short aliases with ^).
XRAY_CODE_RE = re.compile(r"^[Gg]\d{4}$")

ADMIN_KEYWORDS = [
    "진찰료", "관리료", "판독료", "처방전", "원외", "야간진료",
    "특진", "건강검진", "교육상담", "교육·상담", "의약품관리",
    "진료기록", "사본 발급", "사본발급",
]
# If the prescription name contains any of these, it's a lab test not a medicine.
LAB_NAME_KEYWORDS = [
    "검사", "분석", "면역검사", "분자면역", "항체검사",
]
# Explicit lab-test codes that do not match the regex (ad-hoc codenames used by eone).
LAB_CODE_WHITELIST = {
    "LAB", "NK test", "NK_test", "oaa", "OAA", "vitaD", "VitaD", "bsalp", "bsALP",
    "IGF1_bp3", "ferritin", "PTH", "pth", "BCA", "pp2", "hs_CRP", "hs_crp",
    "MAST_IgE", "AMH", "gastropa", "cov19", "osteocal", "tma", "hrv",
}

# Body-part keywords that identify X-ray film orders (name pattern: "{부위}N매").
XRAY_BODY_PARTS = [
    "흉부", "복부", "요추", "골반", "수골", "주관절", "슬개골", "슬관절",
    "족관절", "족골", "비골", "견관절", "대퇴골", "하퇴골", "하퇴", "전척추",
    "늑골", "경추", "흉추", "고관절", "손목", "발목", "신장방광",
]


def _is_xray_film_order(name: str) -> bool:
    """Detect X-ray film / chart-copy line items ending with "N매" or "(계)"."""
    if not name:
        return False
    if re.search(r"\d+\s*매\s*(?:\([^)]+\))?\s*$", name):
        return True
    if "매" in name and any(bp in name for bp in XRAY_BODY_PARTS):
        return True
    return False


def classify(code: str, name: str) -> str:
    code = code.strip()
    name = name.strip()
    # Lab codes (already handled by lab OCR pipeline)
    if LAB_CODE_RE.match(code):
        return "LAB"
    if code in LAB_CODE_WHITELIST:
        return "LAB"
    if any(k in name for k in LAB_NAME_KEYWORDS):
        return "LAB"
    # X-ray film orders (handled by xray_readings pipeline, not prescriptions)
    if XRAY_CODE_RE.match(code):
        return "XRAY"
    if _is_xray_film_order(name):
        return "XRAY"
    # Admin / follow-up
    if code.upper() == "FU":
        return "FOLLOWUP"
    if ADMIN_CODE_RE.match(code):
        return "ADMIN"
    if any(k in name for k in ADMIN_KEYWORDS):
        return "ADMIN"
    # Default: medicine / procedure / injection / supplement
    return "MEDICINE"


def main():
    codes = {}          # code -> {name, classification, count, sample_dose, sample_duration}
    code_counts = defaultdict(int)
    rows_out = []
    total = 0
    kept = 0
    stats = defaultdict(int)

    with open(CSV_PATH, encoding="utf-16") as f:
        reader = csv.reader(f, delimiter="\t")
        header = next(reader)
        for row in reader:
            if len(row) < 13:
                continue
            code = row[0].strip()
            name = row[1].strip()
            chart = row[3].strip()
            patient_name = row[4].strip()
            dose_per_dose = row[5].strip()      # 투여량 (same as 1회투여량 in this file)
            duration = row[6].strip()           # 투여일수
            dose_single = row[7].strip()        # 1회투여량
            dose_total = row[8].strip()         # 총투여량
            rx_date = row[12].strip()           # 처방일자 (YYYY-MM-DD HH:MM)
            doctor = row[23].strip() if len(row) > 23 else ""

            if not code or code.startswith("◀") or code == "처방코드":
                continue

            total += 1
            cls = classify(code, name)
            stats[cls] += 1
            code_counts[code] += 1

            if code not in codes:
                codes[code] = {
                    "code": code,
                    "name": name,
                    "classification": cls,
                    "count": 0,
                    "sample_dose": dose_single,
                    "sample_duration": duration,
                }
            codes[code]["count"] += 1

            if cls in ("MEDICINE",):
                kept += 1
                rows_out.append({
                    "code": code,
                    "name": name,
                    "chart": chart,
                    "patient_name": patient_name,
                    "date": rx_date[:10] if rx_date else "",
                    "datetime": rx_date,
                    "dose_single": dose_single,
                    "duration": duration,
                    "dose_total": dose_total,
                    "doctor": doctor,
                })

    # Sort codes by count descending
    codes_sorted = sorted(codes.values(), key=lambda c: -c["count"])

    OUT_CODES.write_text(json.dumps(codes_sorted, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_ROWS.write_text(json.dumps(rows_out, ensure_ascii=False), encoding="utf-8")

    print(f"Total rows parsed: {total}")
    print(f"Unique codes: {len(codes)}")
    print(f"Medicine/procedure kept rows: {kept}")
    print()
    print("Classification summary:")
    for cls, cnt in sorted(stats.items(), key=lambda x: -x[1]):
        uniq = sum(1 for v in codes.values() if v["classification"] == cls)
        print(f"  {cls:10s}  rows={cnt:7d}  codes={uniq:5d}")

    # Preview of each classification
    print()
    print("=== MEDICINE (top 30 by count) ===")
    for c in [v for v in codes_sorted if v["classification"] == "MEDICINE"][:30]:
        print(f"  {c['count']:6d}  {c['code']:15s}  {c['name'][:70]}")
    print()
    print("=== ADMIN (top 15) ===")
    for c in [v for v in codes_sorted if v["classification"] == "ADMIN"][:15]:
        print(f"  {c['count']:6d}  {c['code']:15s}  {c['name'][:70]}")
    print()
    print("=== LAB (top 15) ===")
    for c in [v for v in codes_sorted if v["classification"] == "LAB"][:15]:
        print(f"  {c['count']:6d}  {c['code']:15s}  {c['name'][:70]}")


if __name__ == "__main__":
    main()
