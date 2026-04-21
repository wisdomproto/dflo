"""Merge per-page parsed eone JSON files into logical lab orders.

Input:  cases/랩데이터_ocr/{chart}.json  (per-chart, page-level reports)
Output: cases/랩데이터_ocr/_aggregated.json

Each logical lab order is one row in the final `lab_tests` table. A single
accession (e.g. IgG4 food intolerance with 4 data pages + 3 info pages) is
collapsed into one entry, and we pick a `test_type` that matches the
lab_tests CHECK constraint from migration 008.
"""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

OCR_DIR = Path(r"C:/projects/dflo_0.1/cases/랩데이터_ocr")
OUT_FILE = OCR_DIR / "_aggregated.json"

# Map per-page report_type → logical test family (used as the second half of
# the group key so multiple panels sharing one accession do not collapse into
# a single lab_tests row).
REPORT_TYPE_TO_FAMILY = {
    "igg4": "food_intolerance",
    "mast": "mast_allergy",
    "nk": "nk_activity",
    "organic_acid_detail": "organic_acid",
    "standard": "blood",
}
ACCESSION_RE = re.compile(r"\b(\d{2}-\d{8}-\d{4})\b")
HAIR_MINERAL_RE = re.compile(r"모발\s*중금속|Hair\s*trace\s*elements", re.IGNORECASE)


def parse_date(text: str | None) -> str | None:
    """Normalize 'YYYY-MM-DD HH:MM' → 'YYYY-MM-DD'. Returns None on failure."""
    if not text:
        return None
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return None


def find_accession_in_raw_text(chunks: list[dict]) -> str | None:
    """Search OCR'd lines for a 18-YYYYMMDD-NNNN accession pattern."""
    for c in chunks:
        m = ACCESSION_RE.search(c.get("text", ""))
        if m:
            return m.group(1)
    return None


def find_date_in_raw_text(chunks: list[dict]) -> str | None:
    """Try to pull a collected_at date from non-standard text dumps."""
    for c in chunks:
        d = parse_date(c.get("text", ""))
        if d:
            return d
    return None


def is_hair_mineral_page(report: dict) -> bool:
    chunks = report.get("unparsed_raw_text") or []
    head = " ".join(c.get("text", "") for c in chunks[:6])
    return bool(HAIR_MINERAL_RE.search(head))


def page_family(report: dict) -> str:
    """Classify a single page into its logical test family."""
    rt = report.get("report_type")
    if rt in REPORT_TYPE_TO_FAMILY:
        return REPORT_TYPE_TO_FAMILY[rt]
    if is_hair_mineral_page(report):
        return "hair_mineral"
    return "attachment"


def assign_group_key(report: dict, chart: str) -> str:
    """Pick a stable key so multi-page reports collapse into one entry.
    Key = (accession or date fallback) × test family. Different panels
    (e.g. MAST + IgG4) sharing one accession stay as separate lab orders."""
    family = page_family(report)
    acc = report.get("accession")
    if not acc:
        acc = find_accession_in_raw_text(report.get("unparsed_raw_text") or [])
    if acc:
        return f"acc:{acc}:{family}"
    date = parse_date(report.get("collected_at")) or find_date_in_raw_text(
        report.get("unparsed_raw_text") or []
    )
    if date:
        return f"date:{chart}:{date}:{family}"
    return f"file:{chart}:{report.get('file')}"


def pick_test_type(reports: list[dict]) -> str:
    # All pages in one group share a family by construction.
    for r in reports:
        return page_family(r)
    return "attachment"


def dedupe_rows(rows: list[dict], key_fields: tuple[str, ...]) -> list[dict]:
    seen: set[tuple] = set()
    out: list[dict] = []
    for r in rows:
        key = tuple(r.get(k) for k in key_fields)
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def build_result_data(reports: list[dict], test_type: str) -> dict[str, Any]:
    """Assemble the payload that lives in lab_tests.result_data."""
    payload: dict[str, Any] = {}

    if test_type == "food_intolerance":
        items: list[dict] = []
        for r in reports:
            if r.get("report_type") == "igg4":
                items.extend(r.get("results", []))
        payload["panel"] = "IgG4_Food"
        payload["items"] = dedupe_rows(items, ("name",))

    elif test_type == "mast_allergy":
        items = []
        for r in reports:
            if r.get("report_type") == "mast":
                items.extend(r.get("results", []))
        payload["panel"] = "MAST_Allergy"
        payload["items"] = dedupe_rows(items, ("name",))

    elif test_type == "nk_activity":
        for r in reports:
            if r.get("report_type") == "nk" and r.get("results"):
                first = r["results"][0]
                payload.update({
                    "panel": "NK_Activity",
                    "value": first.get("value"),
                    "unit": first.get("unit"),
                    "category": first.get("category"),
                })
                break

    elif test_type == "organic_acid":
        markers: list[dict] = []
        for r in reports:
            if r.get("report_type") == "organic_acid_detail":
                markers.extend(r.get("results", []))
        payload["panel"] = "Organic_Acid"
        payload["abnormal_markers"] = dedupe_rows(markers, ("marker", "flag"))

    elif test_type == "blood":
        items = []
        for r in reports:
            if r.get("report_type") == "standard":
                items.extend(r.get("results", []))
        # Standard panel may mix multiple eone "panels" (CBC/Liver/Lipid/...)
        # so we expose them all in one result_data.
        payload["items"] = items

    elif test_type == "hair_mineral":
        # Full numeric extraction not implemented; reference raw text pages.
        payload["panel"] = "Hair_Mineral"
        payload["pages"] = [r.get("file") for r in reports]

    elif test_type == "attachment":
        payload["pages"] = [r.get("file") for r in reports]

    return payload


def aggregate() -> list[dict]:
    out: list[dict] = []
    for f in sorted(OCR_DIR.glob("*.json")):
        if f.name.startswith("_"):
            continue
        chart_data = json.loads(f.read_text(encoding="utf-8"))
        chart = chart_data.get("chart_number")
        patient_hint = chart_data.get("patient_name_raw_ocr")
        gender = chart_data.get("gender")
        birth_prefix = chart_data.get("birth_prefix")

        groups: dict[str, list[dict]] = defaultdict(list)
        for r in chart_data.get("reports", []):
            key = assign_group_key(r, chart)
            groups[key].append(r)

        for key, reports in groups.items():
            test_type = pick_test_type(reports)
            # Header fields (use the first report that has them).
            def pick(field: str) -> str | None:
                for r in reports:
                    v = r.get(field)
                    if v:
                        return v
                return None

            accession = pick("accession")
            if not accession:
                for r in reports:
                    acc = find_accession_in_raw_text(r.get("unparsed_raw_text") or [])
                    if acc:
                        accession = acc
                        break
            collected = parse_date(pick("collected_at")) or parse_date(pick("tested_at"))
            reported = parse_date(pick("reported_at"))
            source_files = [r.get("file") for r in reports if r.get("file")]

            entry = {
                "chart_number": chart,
                "patient_name_raw_ocr": patient_hint,
                "gender": gender,
                "birth_prefix": birth_prefix,
                "test_type": test_type,
                "accession": accession,
                "collected_at": collected,
                "reported_at": reported,
                "source_files": source_files,
                "result_data": build_result_data(reports, test_type),
                "page_count": len(reports),
            }
            out.append(entry)

    return out


def main() -> None:
    agg = aggregate()
    OUT_FILE.write_text(json.dumps(agg, ensure_ascii=False, indent=2), encoding="utf-8")
    # Summary to stdout.
    from collections import Counter
    tt = Counter(e["test_type"] for e in agg)
    print(f"Wrote {len(agg)} aggregated lab orders → {OUT_FILE}")
    for t, n in tt.most_common():
        print(f"  {t:20s}  {n}")


if __name__ == "__main__":
    main()
