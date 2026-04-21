"""Parse cached EasyOCR raw JSONs into structured per-patient lab JSONs.

Input:  cases/랩데이터_ocr/_raw/{chart}/{image}.raw.json
Output: cases/랩데이터_ocr/{chart}.json

Handles the standard eone '검사결과 보고서' template. Non-standard reports
(food intolerance IgG4 bar charts, organic acid metabolites, etc.) are emitted
with an "unparsed_raw_text" fallback so no data is lost.
"""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

RAW_ROOT = Path(r"C:/projects/dflo_0.1/cases/랩데이터_ocr/_raw")
OUT_ROOT = Path(r"C:/projects/dflo_0.1/cases/랩데이터_ocr")

# Column x-center boundaries (inclusive left, exclusive right).
# Determined from inspecting cached raw JSONs; eone template is fixed.
COL_CODE   = (0,   210)   # 보험코드
COL_NAME   = (100, 420)   # 검사명 (overlaps with code on short codes)
COL_RESULT = (420, 510)   # 결과 (right-aligned numeric)
COL_FLAG   = (490, 530)   # 판정 (▲H / ▼L arrow)
COL_REF    = (510, 720)   # 참고치
COL_SAMPLE = (720, 780)   # 검체 (S / B / OT)

# Tolerable y-distance for two OCR boxes to be considered same logical row.
ROW_PIXEL_TOL = 10

# Known insurance codes the lab uses. Used to (a) detect row starts and (b)
# correct common OCR confusions (D↔0 at start of code).
INSURANCE_CODE_RE = re.compile(r"^[D0O]\d{6,7}[HZ]{0,2}$")

HEADER_LABEL_MAP = {
    "수진자명": "patient_header",
    "생년월일": "birth_prefix",
    "차트번호": "chart_number_ocr",
    "검체종류": "sample_type",
    "접수일시": "collected_at",
    "검사일시": "tested_at",
    "보고일시": "reported_at",
    "접수번호": "accession",
}


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def ycenter(line: dict) -> float:
    x1, y1, x2, y2 = line["bbox"]
    return (y1 + y2) / 2.0


def xcenter(line: dict) -> float:
    x1, y1, x2, y2 = line["bbox"]
    return (x1 + x2) / 2.0


def normalize_code(text: str) -> str | None:
    """Return canonical insurance code or None if text is not a code."""
    t = text.strip().replace(" ", "").replace("|", "")
    # Common OCR error: leading 'D' read as '0' or 'O'
    if INSURANCE_CODE_RE.match(t):
        if t.startswith(("0", "O")):
            t = "D" + t[1:]
        return t
    return None


def load_lines(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def cluster_rows(lines: list[dict], y_min: int = 0, y_max: int = 10**6) -> list[list[dict]]:
    """Cluster lines into logical rows by y-center proximity."""
    filtered = [ln for ln in lines if y_min <= ycenter(ln) <= y_max]
    filtered.sort(key=ycenter)
    rows: list[list[dict]] = []
    for ln in filtered:
        yc = ycenter(ln)
        if rows and abs(ycenter(rows[-1][0]) - yc) <= ROW_PIXEL_TOL:
            # Compare to the row's representative y (first element).
            rows[-1].append(ln)
        else:
            # Also try to join with the *last* row's mean y (for multi-width boxes)
            if rows:
                mean_y = sum(ycenter(x) for x in rows[-1]) / len(rows[-1])
                if abs(mean_y - yc) <= ROW_PIXEL_TOL:
                    rows[-1].append(ln)
                    continue
            rows.append([ln])
    for row in rows:
        row.sort(key=xcenter)
    return rows


# ---------------------------------------------------------------------------
# Header parsing (top strip above the "보험코드 검사명 결과 ..." header row)
# ---------------------------------------------------------------------------

HEADER_FIND_LIMIT_Y = 200  # table header row sits around y=215~233

def find_label_row_y(lines: list[dict]) -> int | None:
    """Find y of the column header row '보험코드 검사명 ...'. Returns None if absent."""
    for ln in lines:
        if "보험코드" in ln["text"] or "검사명" in ln["text"]:
            return int(ycenter(ln))
    return None


def parse_header(lines: list[dict], header_stop_y: int) -> dict[str, Any]:
    """Extract metadata fields from top strip (y < header_stop_y)."""
    header: dict[str, Any] = {}
    top_lines = [ln for ln in lines if ycenter(ln) < header_stop_y]

    # Pair each label-ish line with the nearest right-side neighbor.
    for key_kor, key_eng in HEADER_LABEL_MAP.items():
        label_line = None
        for ln in top_lines:
            t = ln["text"].replace(" ", "")
            if key_kor in t:
                label_line = ln
                break
        if not label_line:
            continue
        ly = ycenter(label_line)
        lx2 = label_line["bbox"][2]
        # Find text line to the right, on roughly same row
        best = None
        best_dx = 1e9
        for ln in top_lines:
            if ln is label_line:
                continue
            if abs(ycenter(ln) - ly) > ROW_PIXEL_TOL:
                continue
            dx = ln["bbox"][0] - lx2
            if 0 <= dx < best_dx:
                best = ln
                best_dx = dx
        if best:
            header[key_eng] = best["text"].strip()

    # Patient name + gender/age: "승문우 (M/9)" → name "송윤우" (raw OCR), gender "M", age 9
    if "patient_header" in header:
        m = re.match(r"(.+?)\s*\(([MF])\s*/\s*(\d+)\)", header["patient_header"])
        if m:
            header["patient_name_raw_ocr"] = m.group(1).strip()
            header["gender"] = m.group(2)
            header["age_at_test"] = int(m.group(3))
        header.pop("patient_header", None)

    # Normalize dates: strip extra spaces like "2020-09-25 16: 49" → "2020-09-25 16:49"
    for k in ("collected_at", "tested_at", "reported_at"):
        if k in header:
            header[k] = re.sub(r"\s+", " ", header[k]).replace(" :", ":").replace(": ", ":").replace(" - ", "-").strip()
            # Fix "16: 49" (already handled by above). Also "2020-09-2516:49" case after over-collapse:
            # restore a space between date and time if missing.
            header[k] = re.sub(r"(\d{4}-\d{2}-\d{2})(\d{2}:\d{2})", r"\1 \2", header[k])

    # Normalize birth prefix: "110612-3**** * *" → "110612-3"
    if "birth_prefix" in header:
        m = re.match(r"(\d{6}-\d)", header["birth_prefix"].replace(" ", ""))
        if m:
            header["birth_prefix"] = m.group(1)

    # Sample type cleanup
    if "sample_type" in header:
        header["sample_type"] = header["sample_type"].replace(" ,", ",").strip()

    # Accession regex fallback: some layouts fuse the label with the accession
    # (e.g. "접 수 번호 18-20230810-3070") so the label→neighbor search picks up
    # the wrong field. Scan every top-strip line for the accession pattern and
    # trust the regex if it fires.
    accession_match = None
    for ln in top_lines:
        m = re.search(r"\b(\d{2}-\d{8}-\d{4})\b", ln["text"])
        if m:
            accession_match = m.group(1)
            break
    if accession_match:
        header["accession"] = accession_match

    # Date regex fallback: IgG4 / hair-mineral / other non-standard pages often
    # fuse "검체채취일 YYYY-MM-DD" into one OCR cell, leaving collected_at unset.
    # Pair each date-bearing cell with the nearest same-row label-like text to
    # decide which date field it populates.
    DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")
    LABEL_FIELDS = [
        ("검체채취일", "collected_at"),
        ("검사의뢰일", "tested_at"),
        ("접수일시",   "collected_at"),
        ("검사일시",   "tested_at"),
        ("결과보고일", "reported_at"),
        ("보고일시",   "reported_at"),
    ]
    for ln in top_lines:
        for kor_label, eng_field in LABEL_FIELDS:
            if header.get(eng_field):
                continue  # already populated
            if kor_label.replace(" ", "") in ln["text"].replace(" ", ""):
                # Look for a date in the same cell first, then on the same row.
                m = DATE_RE.search(ln["text"])
                if m:
                    header[eng_field] = m.group(1)
                    break
                ly = ycenter(ln)
                for other in top_lines:
                    if other is ln:
                        continue
                    if abs(ycenter(other) - ly) > ROW_PIXEL_TOL:
                        continue
                    m2 = DATE_RE.search(other["text"])
                    if m2:
                        header[eng_field] = m2.group(1)
                        break

    return header


# ---------------------------------------------------------------------------
# Result-row parsing
# ---------------------------------------------------------------------------

# Guess a 'panel' from test name.
PANEL_HINTS = [
    ("CBC", ["Hb", "Hct", "RBC", "WBC", "Platelet", "MCV", "MCH", "MCHC", "RDW", "MPV", "PDW"]),
    ("Liver", ["Bilirubin", "AST", "ALT", "SGOT", "SGPT", "Alkaline", "r-GTP", "GGT"]),
    ("Lipid", ["Cholesterol", "HDL", "LDL", "TG", "Triglyceride"]),
    ("Glucose", ["Glucose", "HbA1c"]),
    ("Thyroid", ["TSH", "T3", "T4", "Thyroid"]),
    ("Sex Hormone", ["LH", "FSH", "Testosterone", "Estradiol", "Prolactin", "DHEA"]),
    ("Growth", ["IGF"]),
    ("Chemistry", ["Protein Total", "Albumin", "Globulin", "BUN", "Creatinine"]),
    ("Vitamin", ["Vitamin", "25-OH"]),
    ("Adrenal", ["DHEA", "Cortisol"]),
]


def guess_panel(name: str) -> str:
    for panel, keys in PANEL_HINTS:
        for k in keys:
            if k.lower() in name.lower():
                return panel
    return "Other"


NUMBER_RE = re.compile(r"^-?\d+(?:[\.,]\s*\d+)?$")


def try_parse_number(text: str):
    """Return float if text looks like a number (handles '284.08', '7.10', '0.20 이하' → None)."""
    t = text.strip().replace(" ", "").replace(",", ".")
    if NUMBER_RE.match(t):
        try:
            return float(t)
        except ValueError:
            return None
    return None


_MATH_TAG_RE = re.compile(r"<math>(.*?)</math>", re.DOTALL)
_BOLD_TAG_RE = re.compile(r"</?b>")
_FLAG_INLINE_RE = re.compile(r"^(?P<num>-?\d+(?:\.\d+)?)\s*(?P<flag>[▲△▴⏶\^A]\s*H|[▼▽▾⏷v]\s*L|AH|VL|내H|내L)\s*$")

def strip_math_tags(text: str) -> str:
    """Remove Surya-emitted <math>...</math> and <b>...</b> tags while keeping inner text."""
    t = _MATH_TAG_RE.sub(r"\1", text)
    t = _BOLD_TAG_RE.sub("", t)
    return t


def split_value_flag(value_text: str) -> tuple[str, str | None]:
    """Split '311 ▲H' → ('311', 'H'); '76.2 ▼L' → ('76.2', 'L'); '7.47' → ('7.47', None)."""
    if not value_text:
        return value_text, None
    t = value_text.strip()
    m = _FLAG_INLINE_RE.match(t)
    if m:
        num = m.group("num")
        flag_text = m.group("flag").upper()
        if "H" in flag_text:
            return num, "H"
        if "L" in flag_text:
            return num, "L"
    return t, None


_FOOTER_PATTERNS = [
    "검사자", "보고자", "이원의료재단", "EONE Laboratories", "대한진단검사",
    "V2407", "검사기관기호", "검사보고 완료",
]
_NOTE_PATTERN = re.compile(r"^(Note|주의|참고)\s*[:\.]", re.IGNORECASE)


def is_footer_row(row: list[dict]) -> bool:
    text = " ".join(c["text"] for c in row)
    return any(pat in text for pat in _FOOTER_PATTERNS)


def is_note_row(row: list[dict]) -> bool:
    text = " ".join(c["text"] for c in row).strip()
    return bool(_NOTE_PATTERN.match(text)) or text.startswith("*")


def parse_body_rows(rows: list[list[dict]]) -> list[dict]:
    """Parse each row into a result dict. Rows without a code column are merged
    with the previous row (sub-rows like 'MCV / MCH / MCHC' under 'RBC Index')."""
    results: list[dict] = []
    pending_notes: list[str] = []
    for row in rows:
        # Clean up OCR-tag noise on every text field up-front.
        for c in row:
            c["text"] = strip_math_tags(c["text"])

        # Footer rows: signatures, institution addresses, QC stamps, etc.
        if is_footer_row(row):
            continue

        # Note rows attach to the previous result as an annotation.
        if is_note_row(row):
            pending_notes.append(" ".join(c["text"] for c in row).strip())
            continue

        # Split row into columns by x-center.
        code_cells = [c for c in row if xcenter(c) < 210]
        name_cells = [c for c in row if 100 <= xcenter(c) < 420]
        result_cells = [c for c in row if 400 <= xcenter(c) < 510]
        flag_cells = [c for c in row if 485 <= xcenter(c) < 530]
        ref_cells = [c for c in row if 510 <= xcenter(c) < 720]
        sample_cells = [c for c in row if xcenter(c) >= 720]

        # Extract code
        code = None
        remaining_name_texts: list[str] = []
        for c in code_cells:
            txt = c["text"]
            # Sometimes code is fused with name: "03702023 | FSH"
            parts = re.split(r"[|\s]+", txt)
            code_candidate = normalize_code(parts[0]) if parts else None
            if code_candidate:
                code = code_candidate
                # Everything after the code goes into the name
                rest = txt[len(parts[0]):].lstrip(" |").strip()
                if rest:
                    remaining_name_texts.append(rest)
            else:
                remaining_name_texts.append(txt)

        # Name
        name_parts = remaining_name_texts[:]
        for c in name_cells:
            if c in code_cells:
                continue
            name_parts.append(c["text"])
        name = " ".join(p for p in name_parts if p).strip()
        # Strip trailing parenthesized garbage like "(SN-C)" → keep but common "IGF-1 (SN-C)" should be "IGF-1 (SM-C)"
        name = name.replace("SN-C", "SM-C")
        # Normalize whitespace around commas so "Cholesterol, Total" and "Cholesterol,Total"
        # don't produce spurious diffs against hand-curated ground truth.
        name = re.sub(r"\s*,\s*", ",", name)

        # Result
        result_text = " ".join(c["text"] for c in result_cells if c not in code_cells and c not in name_cells).strip()
        # Collapse "284 . 08" → "284.08"
        result_text = re.sub(r"(\d)\s*\.\s*(\d)", r"\1.\2", result_text)

        # Try to split inline flag (Surya often returns "311 ▲H" as one token).
        result_core, inline_flag = split_value_flag(result_text)
        value = try_parse_number(result_core) if result_core else None

        # Flag: look at dedicated flag-x-range cells first, then fall back to inline.
        flag_txt = " ".join(c["text"] for c in flag_cells if c not in result_cells).strip()
        flag = None
        # Normalize: drop mojibake (non-ASCII) chars and collapse to uppercase letters.
        # OCR commonly reads the arrow glyph as garbage and the 'L' as 'I' or '1'.
        flag_clean = re.sub(r"[^A-Za-z]", "", flag_txt).upper()
        if "H" in flag_clean or "▲" in flag_txt:
            flag = "H"
        elif "L" in flag_clean or "I" in flag_clean or "▼" in flag_txt or "▽" in flag_txt:
            flag = "L"
        if flag is None and inline_flag:
            flag = inline_flag
        # If flag was extracted inline, update result_text so downstream (value string
        # fallback) doesn't still carry the "▲H" suffix.
        if inline_flag and result_core:
            result_text = result_core

        # Reference
        ref_parts = [c["text"] for c in ref_cells]
        ref = " ".join(ref_parts).strip() if ref_parts else ""
        # Fix common unit typos
        ref = (ref
               .replace("pIU/mL", "μIU/mL")
               .replace("PB/mL", "pg/mL")
               .replace("nglmL", "ng/mL")
               .replace("mIUm", "mIU/mL")
               .replace("ngldL", "ng/dL"))

        # Sample
        sample_txt = " ".join(c["text"] for c in sample_cells).strip().upper()
        sample = None
        for s in ("OT", "S", "B", "U"):
            if re.search(rf"\b{s}\b", sample_txt) or sample_txt == s:
                sample = s
                break

        # Skip empty rows and header rows
        if not (code or name or result_text):
            continue
        if name.strip() in ("보험코드", "검사명", "결과", "판정", "참고치", "검체"):
            continue
        # Skip table header row
        if not code and not result_text and name in ("보험코드 검사명 결과 판정 참고치 검체",):
            continue

        entry = {
            "code": code,
            "name": name,
            "value": value if value is not None else (result_text or None),
            "unit": None,  # extract later from ref if present
            "ref": ref or None,
            "flag": flag,
            "panel": guess_panel(name) if name else "Other",
            "sample": sample,
        }
        # If name/code both empty and no result → drop
        if not entry["name"] and not entry["code"] and entry["value"] is None:
            continue
        # Skip the "RBC Index" label row (it's a sub-header, not a result).
        if entry["name"].strip().upper() == "RBC INDEX" and entry["value"] is None:
            continue
        # Sub-rows under "RBC Index" (MCV/MCH/MCHC/RDW/MPV/PDW) have no code;
        # inherit panel from CBC context.
        if not entry["code"] and entry["name"] in ("MCV", "MCH", "MCHC", "RDW", "MPV", "PDW"):
            entry["panel"] = "CBC"
            entry["sample"] = entry["sample"] or "B"

        # Attach any pending notes from preceding rows to this entry.
        if pending_notes:
            entry["notes"] = pending_notes[:]
            pending_notes.clear()

        results.append(entry)
    return results


# ---------------------------------------------------------------------------
# IgG4 Food Intolerance panel (non-standard bar-chart report)
# ---------------------------------------------------------------------------

# Each data page has a header block (y < 230), a small table header with the
# U/mL scale (y ~250), then ~15-18 food rows in the left column (x < 500) and
# explanatory text in the right column (x > 520). Data columns:
#   x < 210:   food name "우유(Cow's milk)"
#   x 210-260: value token "0.54" or "< 0.35"
#   x 475-500: Class "0" / "1" / "2" ... (OCR sometimes reads 0 as 'n' or 'D')
IGG4_NAME_RE = re.compile(r"[\w가-힣]+\s*\([A-Za-z].*\)")


def is_igg4_page(lines: list[dict]) -> bool:
    for ln in lines:
        t = ln["text"]
        if "음식 과민증 IgG4" in t or "Food Intolerance IgG4" in t:
            return True
    return False


def parse_igg4_class(text: str) -> str | None:
    """Class is a small integer 0-6. OCR sometimes emits 'n', 'D', 'o' for 0."""
    t = text.strip()
    if not t:
        return None
    if t in ("n", "D", "o", "O"):
        return "0"
    m = re.match(r"^\d$", t)
    if m:
        return t
    return t  # keep raw for manual inspection


def parse_igg4_page(lines: list[dict], image_name: str) -> dict:
    # IgG4 header region: use a fixed y=230 so dates/accession/name are picked up.
    header = parse_header(lines, header_stop_y=230)
    # Drop sample_type/collected_at mojibake — IgG4 cover labels are often garbled;
    # keep only fields that parsed into clean ASCII.
    for k in list(header.keys()):
        v = header[k]
        if isinstance(v, str) and "\ufffd" in v:
            del header[k]

    # Body: cluster rows by y, but only consider left-column tokens (x < 520).
    left_only = [ln for ln in lines if xcenter(ln) < 520 and 260 < ycenter(ln) < 1020]
    rows = cluster_rows(left_only, y_min=260, y_max=1020)

    results: list[dict] = []
    for row in rows:
        name_cells = [c for c in row if xcenter(c) < 210]
        value_cells = [c for c in row if 210 <= xcenter(c) < 270]
        class_cells = [c for c in row if 470 <= xcenter(c) < 505]
        name = " ".join(c["text"] for c in name_cells).strip()
        if not IGG4_NAME_RE.search(name):
            continue
        value_txt = " ".join(c["text"] for c in value_cells).strip()
        class_txt = " ".join(c["text"] for c in class_cells).strip()
        cls = parse_igg4_class(class_txt)
        num_val = try_parse_number(value_txt)
        # Skip section header rows like "유제품/육류(Dairy/Meat)" which have no
        # value or class attached.
        if num_val is None and not value_txt and not cls:
            continue
        results.append({
            "name": name,
            "value": num_val if num_val is not None else (value_txt or None),
            "class": cls,
            "unit": "U/mL",
            "panel": "IgG4_Food",
            "sample": "S",
        })

    # If no actual food rows were extracted, this page is a summary/info page
    # (cover, symptom list, signature). Demote it to non-standard so the diff
    # tool doesn't duplicate the logical report.
    if not results:
        return {
            "file": image_name,
            "report_type": "non-standard",
            "unparsed_raw_text": [
                {"bbox": ln["bbox"], "text": ln["text"]} for ln in lines
            ],
        }

    return {
        "file": image_name,
        "report_type": "igg4",
        **header,
        "results": results,
    }


# ---------------------------------------------------------------------------
# MAST Allergy panel (dual-column tabular)
# ---------------------------------------------------------------------------

# Layout (each row spans both columns):
#   Left:  구분(x~45-120) | Allergen명(x~90-250) | Korean(x~250-335) |
#          결과 IU/mL(x~335-410) | Class(x~376-400)
#   Right: 구분(x~425) | Allergen명(x~465-555) | Korean(x~595-680) |
#          결과(x~685-720) | Class(x~720-755)
# Header row has "구분 | Allergen명 | 결과 | Class" twice (y ~220-240).

MAST_TITLE_RE = re.compile(r"MAST\s*Allergy", re.IGNORECASE)


def is_mast_page(lines: list[dict]) -> bool:
    top = " ".join(ln["text"] for ln in lines[:8])
    return bool(MAST_TITLE_RE.search(top))


def _extract_mast_half(row: list[dict], x_start: int, x_end: int) -> dict | None:
    """Extract one allergen row from a half-column span."""
    cells = [c for c in row if x_start <= xcenter(c) < x_end]
    if not cells:
        return None
    # Split by x-range within this half.
    w = x_end - x_start
    group_end = x_start + int(w * 0.18)     # 구분 (group label)
    name_end  = x_start + int(w * 0.62)     # Allergen English + Korean
    value_end = x_start + int(w * 0.88)     # IU/mL value
    # Class is the remainder.
    group_cells = [c for c in cells if xcenter(c) < group_end]
    name_cells  = [c for c in cells if group_end <= xcenter(c) < name_end]
    value_cells = [c for c in cells if name_end  <= xcenter(c) < value_end]
    class_cells = [c for c in cells if xcenter(c) >= value_end]

    group = " ".join(c["text"] for c in group_cells).strip()
    name = " ".join(c["text"] for c in name_cells).strip()
    value_txt = " ".join(c["text"] for c in value_cells).strip()
    class_txt = " ".join(c["text"] for c in class_cells).strip()

    # Drop pure header rows.
    if name in ("Allergen명", "") or "Allergen" == name.strip():
        return None
    if value_txt in ("결과", "(IU/mL)") or class_txt == "Class":
        return None

    num_val = try_parse_number(value_txt.replace("<", "").strip()) if value_txt else None
    cls = class_txt if class_txt in {str(i) for i in range(8)} else None

    if not name and not value_txt:
        return None
    return {
        "group": group or None,
        "name": name or None,
        "value": num_val if num_val is not None else (value_txt or None),
        "class": cls,
        "unit": "IU/mL",
    }


def parse_mast_page(lines: list[dict], image_name: str) -> dict:
    header = parse_header(lines, header_stop_y=210)
    results: list[dict] = []
    # Body rows below the header table titles.
    body_rows = cluster_rows(lines, y_min=245, y_max=1000)
    # Remember the most recent group label per column (labels span multiple rows).
    left_group = None
    right_group = None
    for row in body_rows:
        left = _extract_mast_half(row, 30, 420)
        right = _extract_mast_half(row, 420, 760)
        for half, current in [(left, left_group), (right, right_group)]:
            if not half:
                continue
            g = half.pop("group")
            if g:
                current = g
            half["group"] = current
        # Update stored group refs.
        if left and left.get("group"):
            left_group = left["group"]
        if right and right.get("group"):
            right_group = right["group"]
        for half in (left, right):
            if half and half.get("name"):
                half["panel"] = "MAST_Allergy"
                half["sample"] = "S"
                results.append(half)

    if not results:
        return {
            "file": image_name,
            "report_type": "non-standard",
            "unparsed_raw_text": [{"bbox": ln["bbox"], "text": ln["text"]} for ln in lines],
        }
    return {
        "file": image_name,
        "report_type": "mast",
        **header,
        "results": results,
    }


# ---------------------------------------------------------------------------
# NK cell activity (single-value)
# ---------------------------------------------------------------------------

NK_TITLE_RE = re.compile(r"NK\s*(세포)?\s*활성도", re.IGNORECASE)
NK_VALUE_RE = re.compile(r"NK\s*세포\s*활성도[^:：]*[:：]?\s*(\d+(?:\.\d+)?)\s*(pg/mL|pg\s*/mL)?", re.IGNORECASE)
NK_CATEGORY_WORDS = ["정상", "관심", "경계", "이상"]


def is_nk_data_page(lines: list[dict]) -> bool:
    """Detect the single NK result page (not the cover or info pages)."""
    text = " ".join(ln["text"] for ln in lines)
    if "NK cell activity" not in text and "NK 세포활성도" not in text:
        return False
    # Data page has the value embedded in a result sentence.
    return bool(NK_VALUE_RE.search(text)) or any(w in text for w in NK_CATEGORY_WORDS)


def parse_nk_page(lines: list[dict], image_name: str) -> dict:
    header = parse_header(lines, header_stop_y=230)
    text = " ".join(ln["text"] for ln in lines)
    m = NK_VALUE_RE.search(text)
    value = float(m.group(1)) if m else None
    # Category classification from thresholds or from OCR'd verdict.
    category = None
    if value is not None:
        if value >= 500: category = "정상"
        elif value >= 250: category = "관심"
        elif value >= 100: category = "경계"
        else: category = "이상"

    results = []
    if value is not None:
        results.append({
            "name": "NK cell activity",
            "value": value,
            "unit": "pg/mL",
            "category": category,
            "panel": "NK_Activity",
        })

    if not results:
        return {
            "file": image_name,
            "report_type": "non-standard",
            "unparsed_raw_text": [{"bbox": ln["bbox"], "text": ln["text"]} for ln in lines],
        }
    return {
        "file": image_name,
        "report_type": "nk",
        **header,
        "results": results,
    }


# ---------------------------------------------------------------------------
# Organic Acid Profile / Hair Mineral - abnormal marker extraction
# ---------------------------------------------------------------------------
# Both reports are large multi-page. We extract only clinically useful info
# from the "상세 결과 보고서" / "이상결과 종합" pages: per-category list of
# markers that are flagged (H/L/BH/BL) with accompanying narrative.

OAP_TITLE_RE = re.compile(r"유기산|Organic\s*acids\s*profile", re.IGNORECASE)
HM_TITLE_RE = re.compile(r"모발\s*중금속|Hair\s*trace\s*elements", re.IGNORECASE)
DETAIL_MARKER_RE = re.compile(r"^(BH|BL|H|L|B[HhIi]|Β[HIΙ]|в[нни])$", re.IGNORECASE)


def is_oap_page(lines: list[dict]) -> bool:
    top = " ".join(ln["text"] for ln in lines[:6])
    return bool(OAP_TITLE_RE.search(top))


def is_hm_page(lines: list[dict]) -> bool:
    top = " ".join(ln["text"] for ln in lines[:6])
    return bool(HM_TITLE_RE.search(top))


_FLAG_CHAR_MAP = {
    # Greek capitals
    "Β": "B", "Η": "H", "Ι": "I",
    # Cyrillic look-alikes
    "В": "B", "Н": "H", "И": "H",
    "в": "b", "н": "h", "и": "h",
}


def _normalize_detail_flag(text: str) -> str | None:
    """Fold OCR variants of H/L/BH/BL into a canonical flag."""
    t = "".join(_FLAG_CHAR_MAP.get(c, c) for c in text)
    t = re.sub(r"[^A-Za-z]", "", t).upper()
    # 'I' is a frequent OCR error for 'L' in this font.
    t = t.replace("I", "L")
    if t in ("BH", "BL", "H", "L"):
        return t
    return None


def _is_category_header(text: str) -> bool:
    """Pages group markers under bilingual category headers like
    'Carbohydrate metabolism (탄수화물 대사)'."""
    return bool(re.search(r"\(.*[가-힣].*\)\s*$", text.strip())) and "metabolism" in text.lower() \
        or bool(re.match(r"^[A-Z][a-z]+(\s+[a-z\-]+){0,3}\s*\([가-힣\s]+\)\s*$", text.strip()))


def _parse_detail_page(lines: list[dict], panel_label: str, image_name: str, report_type: str) -> dict:
    """Parse a '상세 결과 보고서' / '이상결과 종합' style page: category headers at
    x<130 with markers + flag on inner columns and narrative on the right (x>300)."""
    header = parse_header(lines, header_stop_y=230)
    results: list[dict] = []
    rows = cluster_rows(lines, y_min=240, y_max=1000)

    # Two passes: first, locate category headers and marker+flag rows.
    category_rows: list[tuple[int, str]] = []   # (y, text)
    marker_rows:   list[tuple[int, str, str]] = []  # (y, marker, flag)
    narrative_rows: list[tuple[int, str]] = []   # (y, text)

    def _is_category_text(txt: str) -> bool:
        return (
            bool(txt)
            and bool(re.search(r"[A-Za-z]", txt))
            and "(" in txt and ")" in txt
            and bool(re.search(r"[가-힣]", txt))  # Korean in parens
        )

    for row in rows:
        left  = [c for c in row if xcenter(c) < 130]
        mid   = [c for c in row if 130 <= xcenter(c) < 300]
        right = [c for c in row if xcenter(c) >= 300]
        row_y = int(sum(ycenter(c) for c in row) / len(row))

        left_txt = " ".join(c["text"] for c in left).strip()
        mid_tokens = [c["text"] for c in mid]

        # Category header: an English name with Korean-in-parens.  The header
        # can sit in either the left column (x<130) or the middle column (when
        # there's nothing else on that row).
        if _is_category_text(left_txt):
            category_rows.append((row_y, left_txt))
        elif len(mid_tokens) == 1 and _is_category_text(mid_tokens[0]):
            category_rows.append((row_y, mid_tokens[0].strip()))
        elif len(mid_tokens) >= 2:
            # Marker + flag row: last token is the flag.
            name_text = " ".join(mid_tokens[:-1]).strip()
            flag = _normalize_detail_flag(mid_tokens[-1])
            if flag and name_text and re.search(r"[A-Za-z]", name_text):
                marker_rows.append((row_y, name_text, flag))

        if right:
            narrative_rows.append((row_y, " ".join(c["text"] for c in right).strip()))

    # For each marker, pick the most recent preceding category and any
    # narrative rows within a 30px window of the marker row.
    def category_for(y: int) -> str | None:
        prev = None
        for cy, txt in category_rows:
            if cy <= y:
                prev = txt
            else:
                break
        return prev

    def notes_for(y: int) -> str | None:
        near = [t for ny, t in narrative_rows if abs(ny - y) <= 30]
        return " ".join(near).strip() or None

    for y, marker, flag in marker_rows:
        results.append({
            "category": category_for(y),
            "marker": marker,
            "flag": flag,
            "panel": panel_label,
            "notes": notes_for(y),
        })

    if not results:
        return {
            "file": image_name,
            "report_type": "non-standard",
            "unparsed_raw_text": [{"bbox": ln["bbox"], "text": ln["text"]} for ln in lines],
        }
    return {
        "file": image_name,
        "report_type": report_type,
        **header,
        "results": results,
    }


def parse_oap_detail_page(lines: list[dict], image_name: str) -> dict:
    return _parse_detail_page(lines, "Organic_Acid", image_name, "organic_acid_detail")


def parse_hm_detail_page(lines: list[dict], image_name: str) -> dict:
    return _parse_detail_page(lines, "Hair_Mineral", image_name, "hair_mineral_detail")


# ---------------------------------------------------------------------------
# Per-image parser
# ---------------------------------------------------------------------------

def parse_image(raw_lines: list[dict], image_name: str) -> dict:
    hdr_y = find_label_row_y(raw_lines)
    has_standard_header = hdr_y is not None and hdr_y < 300

    if has_standard_header:
        header = parse_header(raw_lines, hdr_y)
        body_rows = cluster_rows(raw_lines, y_min=hdr_y + 5, y_max=hdr_y + 800)
        results = parse_body_rows(body_rows)
        return {
            "file": image_name,
            "report_type": "standard",
            **header,
            "results": results,
        }

    if is_igg4_page(raw_lines):
        return parse_igg4_page(raw_lines, image_name)

    if is_mast_page(raw_lines):
        return parse_mast_page(raw_lines, image_name)

    if is_nk_data_page(raw_lines):
        return parse_nk_page(raw_lines, image_name)

    if is_oap_page(raw_lines):
        # Organic acid pages come in many flavors (covers, summaries, bar
        # charts, detail narratives). The detail-narrative page has markers +
        # flags; _parse_detail_page handles that and falls through to
        # non-standard when no markers are found.
        result = parse_oap_detail_page(raw_lines, image_name)
        if result.get("report_type") == "organic_acid_detail":
            return result

    if is_hm_page(raw_lines):
        result = parse_hm_detail_page(raw_lines, image_name)
        if result.get("report_type") == "hair_mineral_detail":
            return result

    # Non-standard report (cover pages, bar charts, education pages).
    # Emit a text-dump report for manual post-processing.
    return {
        "file": image_name,
        "report_type": "non-standard",
        "unparsed_raw_text": [
            {"bbox": ln["bbox"], "text": ln["text"]} for ln in raw_lines
        ],
    }


# ---------------------------------------------------------------------------
# Per-patient aggregation
# ---------------------------------------------------------------------------

def parse_patient(chart_dir: Path) -> dict:
    chart = chart_dir.name
    raw_files = sorted(chart_dir.glob("*.raw.json"))
    reports = []
    for rf in raw_files:
        lines = load_lines(rf)
        image_name = rf.stem.replace(".raw", "") + ".jpg"
        reports.append(parse_image(lines, image_name))

    # Derive stable patient-level fields from first standard report
    patient_fields = {}
    for r in reports:
        if r.get("report_type") == "standard":
            for k in ("patient_name_raw_ocr", "gender", "birth_prefix"):
                if k in r and k not in patient_fields:
                    patient_fields[k] = r[k]
            if "patient_name_raw_ocr" in patient_fields:
                break

    return {
        "chart_number": chart,
        **patient_fields,
        "reports": reports,
    }


def main(argv: list[str]) -> None:
    charts = argv[1:] if len(argv) > 1 else None
    dirs = sorted([p for p in RAW_ROOT.iterdir() if p.is_dir()])
    if charts:
        dirs = [d for d in dirs if d.name in charts]

    for d in dirs:
        print(f"Parsing {d.name} ({len(list(d.glob('*.raw.json')))} images)")
        data = parse_patient(d)
        out = OUT_ROOT / f"{d.name}.json"
        out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  -> {out}")


if __name__ == "__main__":
    main(sys.argv)
