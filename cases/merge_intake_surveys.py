"""Consolidate intake surveys from two sources into one dataset.

Sources:
  1) Scanned handwritten 초진기록지 PDFs → AI-extracted JSON shards
     (out/_work/intake_pdf/extract_*.json, ~185 records)
  2) Typed 성장문진표 docx → cases/intake_surveys_parsed.json (36 records)

Output:
  - cases/intake_pdf_extracted.json     (durable copy of the 185 PDF records)
  - cases/intake_surveys_consolidated.json (unified, deduped by name+birthdate)

Dedup is conservative: exact (normalized name, normalized birthdate). Records with
no readable name are kept standalone. Merged records carry `sources`, `page_refs`,
`chart_numbers`, and a unioned `low_confidence`.
"""
from __future__ import annotations

import glob
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
PDF_SHARDS = sorted((ROOT / "out/_work/intake_pdf").glob("extract_*.json"))
DOCX_PARSED = ROOT / "cases/intake_surveys_parsed.json"
OUT_PDF = ROOT / "cases/intake_pdf_extracted.json"
OUT_CONSOLIDATED = ROOT / "cases/intake_surveys_consolidated.json"

UNIFIED_FIELDS = [
    "gender", "gestational_weeks", "birth_weight_kg", "birth_notes",
    "current_height_cm", "last_year_growth_cm", "current_weight_kg",
    "grade", "class_height_rank", "father_height_cm", "mother_height_cm",
    "past_growth_clinic", "parents_interested", "desired_height_cm",
    "sports_athlete", "child_interested", "past_clinic_visits",
    "puberty_note", "causes", "labs", "chronic_conditions",
]


def norm_name(name) -> str:
    if not name or not isinstance(name, str):
        return ""
    return re.sub(r"\s+", "", name).strip()


def norm_birth(b) -> str:
    """Best-effort YYYY-MM-DD from messy birthdate strings; '' if unparseable."""
    if b is None:
        return ""
    digits = re.sub(r"\D", "", str(b))
    if len(digits) == 6:
        yy, mm, dd = int(digits[:2]), digits[2:4], digits[4:6]
        year = 2000 + yy if yy <= 25 else 1900 + yy
        if 1 <= int(mm) <= 12 and 1 <= int(dd) <= 31:
            return f"{year}-{mm}-{dd}"
    if len(digits) == 8:
        y, mm, dd = digits[:4], digits[4:6], digits[6:8]
        if 1 <= int(mm) <= 12 and 1 <= int(dd) <= 31:
            return f"{y}-{mm}-{dd}"
    return ""


def num(x):
    """Coerce numeric-looking value to float, else keep original (or None)."""
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return x
    m = re.search(r"-?\d+(?:\.\d+)?", str(x))
    return float(m.group()) if m else (x or None)


def blank(v) -> bool:
    return v is None or v == "" or v == {} or v == []


# ── load PDF shards ───────────────────────────────────────────────
pdf_records: list[dict] = []
shard_counts: dict[str, int] = {}
for s in PDF_SHARDS:
    data = json.loads(s.read_text(encoding="utf-8"))
    shard_counts[s.name] = len(data)
    pdf_records.extend(data)

OUT_PDF.write_text(json.dumps(pdf_records, ensure_ascii=False, indent=2), encoding="utf-8")

# duplicate page_ref check (boundary safety)
seen_ref: dict[str, int] = {}
dup_refs = []
for r in pdf_records:
    ref = r.get("page_ref")
    if ref:
        seen_ref[ref] = seen_ref.get(ref, 0) + 1
        if seen_ref[ref] == 2:
            dup_refs.append(ref)


# ── map docx → unified shape ──────────────────────────────────────
def docx_to_unified(rec: dict) -> dict:
    raw = rec.get("raw", {})
    g = lambda q: raw.get(f"q{q}_raw")
    return {
        "name": g(1),
        "gender": None,
        "birth_date": g(2),
        "gestational_weeks": num(g(3)),
        "birth_weight_kg": num(g(4)),
        "birth_notes": g(5),
        "current_height_cm": num(g(6)),
        "current_weight_kg": num(g(7)),
        "last_year_growth_cm": num(g(8)),
        "grade": g(9),
        "class_height_rank": g(10),
        "desired_height_cm": num(g(12)),
        "father_height_cm": num(g(13)),
        "mother_height_cm": num(g(14)),
        "growth_history": raw.get("q11_growth_history", {}),
        "chronic_conditions": g(19),
        "causes": g(22),
        "chart_number": rec.get("chart_number"),
        "source": "docx",
        "page_ref": None,
        "low_confidence": [],
    }


docx_records = [docx_to_unified(r) for r in json.loads(DOCX_PARSED.read_text(encoding="utf-8"))]
for r in pdf_records:
    r["source"] = "pdf"

# ── merge + dedup by (norm_name, norm_birth) ──────────────────────
groups: dict[tuple, list[dict]] = {}
standalone: list[dict] = []
for r in pdf_records + docx_records:
    nm, bd = norm_name(r.get("name")), norm_birth(r.get("birth_date"))
    if nm and bd:
        groups.setdefault((nm, bd), []).append(r)
    else:
        standalone.append(r)


def merge_group(recs: list[dict]) -> dict:
    out = {"name": None, "birth_date": None}
    sources, page_refs, charts, lowconf = set(), [], [], set()
    for r in recs:
        out["name"] = out["name"] or r.get("name")
        out["birth_date"] = out["birth_date"] or r.get("birth_date")
        for f in UNIFIED_FIELDS:
            if blank(out.get(f)) and not blank(r.get(f)):
                out[f] = r.get(f)
        # growth_history: union by age
        gh = out.get("growth_history") or {}
        for k, v in (r.get("growth_history") or {}).items():
            gh.setdefault(str(k), v)
        if gh:
            out["growth_history"] = gh
        sources.add(r.get("source"))
        if r.get("page_ref"):
            page_refs.append(r["page_ref"])
        if r.get("chart_number"):
            charts.append(r["chart_number"])
        for lc in r.get("low_confidence") or []:
            lowconf.add(lc)
    out["birth_date_norm"] = norm_birth(out.get("birth_date"))
    out["sources"] = sorted(s for s in sources if s)
    out["page_refs"] = page_refs
    out["chart_numbers"] = charts
    out["low_confidence"] = sorted(lowconf)
    return out


RANGES = {
    "father_height_cm": (130, 210), "mother_height_cm": (125, 200),
    "current_height_cm": (70, 200), "desired_height_cm": (100, 220),
    "birth_weight_kg": (0.4, 6.0), "gestational_weeks": (20, 43),
    "current_weight_kg": (5, 150), "last_year_growth_cm": (0, 25),
}


def sanity_flags(r: dict) -> list[str]:
    """Flag numeric fields outside plausible human ranges (catches mis-read/field-swap)."""
    flags = []
    for f, (lo, hi) in RANGES.items():
        v = r.get(f)
        if isinstance(v, (int, float)) and not (lo <= v <= hi):
            flags.append(f)
    return flags


consolidated = [merge_group(g) for g in groups.values()]
for r in standalone:
    r["birth_date_norm"] = norm_birth(r.get("birth_date"))
    r["sources"] = [r.get("source")] if r.get("source") else []
    r["page_refs"] = [r["page_ref"]] if r.get("page_ref") else []
    r["chart_numbers"] = [r["chart_number"]] if r.get("chart_number") else []
    for k in ("source", "page_ref", "chart_number"):
        r.pop(k, None)
    consolidated.append(r)

for r in consolidated:
    nr = sanity_flags(r)
    if nr:
        r["needs_review"] = nr

consolidated.sort(key=lambda r: (norm_name(r.get("name")) or "zzz", r.get("birth_date_norm") or ""))
OUT_CONSOLIDATED.write_text(json.dumps(consolidated, ensure_ascii=False, indent=2), encoding="utf-8")

# ── stats ─────────────────────────────────────────────────────────
both = sum(1 for r in consolidated if set(r.get("sources", [])) >= {"pdf", "docx"})
pdf_only = sum(1 for r in consolidated if r.get("sources") == ["pdf"])
docx_only = sum(1 for r in consolidated if r.get("sources") == ["docx"])
merged_pdf_dups = len(pdf_records) + len(docx_records) - len(consolidated)
no_name = sum(1 for r in consolidated if not norm_name(r.get("name")))
any_lowconf = sum(1 for r in consolidated if r.get("low_confidence"))
needs_review = sum(1 for r in consolidated if r.get("needs_review"))

print("PDF shards:")
for k, v in shard_counts.items():
    print(f"  {k}: {v}")
print(f"PDF records total: {len(pdf_records)}  (durable -> {OUT_PDF.relative_to(ROOT)})")
print(f"docx records: {len(docx_records)}")
print(f"duplicate page_refs (should be none): {dup_refs or 'none'}")
print("-- consolidated --")
print(f"  unique people: {len(consolidated)}")
print(f"  pdf+docx (same person both forms): {both}")
print(f"  pdf only: {pdf_only}   docx only: {docx_only}")
print(f"  records merged away by dedup: {merged_pdf_dups}")
print(f"  no readable name (kept standalone): {no_name}")
print(f"  has low_confidence flags: {any_lowconf}")
print(f"  implausible numeric (needs_review): {needs_review}")
print(f"-> {OUT_CONSOLIDATED.relative_to(ROOT)}")
