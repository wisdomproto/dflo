"""Parse NEW성장문진표(완) docx files into structured JSON for DB import.

Only answered fields are emitted; empty values are dropped.
Output: cases/intake_surveys_parsed.json
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

import docx  # python-docx

sys.stdout.reconfigure(encoding="utf-8")

SURVEY_DIR = Path(__file__).parent / "NEW성장문진표(완)"
OUT_PATH = Path(__file__).parent / "intake_surveys_parsed.json"

# Question number → human tag (for reference only)
Q_LABELS: dict[int, str] = {
    1: "name",
    2: "birth_date",
    3: "birth_week",
    4: "birth_weight",
    5: "birth_notes",
    6: "current_height_cm",
    7: "current_weight_kg",
    8: "last_year_growth_cm",
    9: "grade",
    10: "class_height_rank",
    12: "desired_height",
    13: "father_height",
    14: "mother_height",
    15: "sports_athlete_letter",
    16: "parents_interested_letter",
    17: "child_interested_letter",
    18: "past_clinic_letter",
    19: "chronic_conditions",
    20: "recent_growth_letter",       # a/b/c
    21: "tanner_letter",               # a-e
    22: "short_stature_causes_letters",  # "a,d" etc.
}

GROWTH_AGE_RE = re.compile(r"^([a-gA-G])\.\s*(\d+)\s*세")
Q_LINE_RE = re.compile(r"^(\d+)\.\s*(.+?)(?::\s*(.*))?$")


def parse_docx(path: Path) -> dict:
    doc = docx.Document(str(path))
    # Unicode normalize + split on \n since many paragraphs pack question + option lines together.
    raw = [unicodedata.normalize("NFC", p.text) for p in doc.paragraphs]
    paragraphs: list[str] = []
    for blob in raw:
        for line in blob.split("\n"):
            s = line.strip()
            if s:
                paragraphs.append(s)

    out: dict = {}
    # Handle Q11 (growth history a-f) which spans multiple paragraphs
    current_q: int | None = None
    growth_map: dict[int, str] = {}
    seen_q20 = False  # Survey has two "20." sections; second is causes → store as q22

    i = 0
    while i < len(paragraphs):
        line = paragraphs[i]
        # Main question line
        m = Q_LINE_RE.match(line)
        if m:
            qnum = int(m.group(1))
            question = m.group(2).strip()
            answer = (m.group(3) or "").strip()
            # Duplicate "20." in template: second one is short stature causes → rename to 22
            if qnum == 20:
                if seen_q20:
                    qnum = 22
                else:
                    seen_q20 = True
            current_q = qnum
            if qnum == 11:
                growth_map = {}
            if answer:
                out[f"q{qnum}_raw"] = answer
            out[f"q{qnum}_question"] = question
            i += 1
            continue
        # Sub-line for Q11 growth history: "a. 8세 (초1) : 4.5"
        if current_q == 11:
            sub = re.match(
                r"^([a-fA-F])\.\s*(\d+)\s*세\s*(?:\(.*?\))?\s*:\s*(.*)$",
                line,
            )
            if sub:
                age = int(sub.group(2))
                val = sub.group(3).strip()
                if val:
                    growth_map[age] = val
        i += 1

    if growth_map:
        out["q11_growth_history"] = growth_map

    return out


def extract_chart_number(name: str) -> str | None:
    # Filenames: "26176 김리후 성장문진표.docx" or "27341김샤론 성장문진표.docx"
    m = re.match(r"^(\d{4,6})\s*", name)
    return m.group(1) if m else None


def main() -> None:
    files = sorted(SURVEY_DIR.glob("*.docx"))
    results: list[dict] = []
    for f in files:
        chart = extract_chart_number(f.name)
        if not chart:
            print(f"[skip] no chart: {f.name}", file=sys.stderr)
            continue
        try:
            parsed = parse_docx(f)
        except Exception as e:
            print(f"[error] {f.name}: {e}", file=sys.stderr)
            continue
        results.append({
            "chart_number": chart,
            "file": f.name,
            "raw": parsed,
        })
        print(f"[ok] {chart} {f.name} - {len([k for k in parsed if k.endswith('_raw') or k == 'q11_growth_history'])} answered")

    OUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {len(results)} surveys to {OUT_PATH}")


if __name__ == "__main__":
    main()
