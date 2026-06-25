"""Build the intake-survey review tool's data + images into v4/public/intake-review/.

Each scanned 초진기록지 person = 2 pages (FRONT Q1~16 at even page + BACK Q17 lab/Tanner at front+1).
Renders BOTH pages to web JPEGs and emits data.json with per-record `images` = [front, back].
docx records (typed) have no scan image. Output dir is PHI → gitignored; re-run anytime.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
CONSOLIDATED = ROOT / "cases/intake_surveys_consolidated.json"
PDF_DIR = ROOT / "cases/NEW성장문진표(완)"
OUT_DIR = ROOT / "v4/public/intake-review"
IMG_DIR = OUT_DIR / "img"
IMG_DIR.mkdir(parents=True, exist_ok=True)

TAG_PDF = {
    "scan2": "스캔본 2차.pdf",
    "chojin": "초진기록지 스캔본 (1).pdf",
    "cam": "CamScanner 2026. 6. 22. 11.51.pdf",
}

records = json.loads(CONSOLIDATED.read_text(encoding="utf-8"))


def parse_ref(refs):
    if not refs:
        return None
    m = re.match(r"(\w+)#p(\d+)", refs[0])
    return (m.group(1), int(m.group(2))) if m else None


# fronts per tag
fronts: dict[str, set[int]] = {t: set() for t in TAG_PDF}
for r in records:
    pr = parse_ref(r.get("page_refs") or [])
    if pr and pr[0] in fronts:
        fronts[pr[0]].add(pr[1])

# render fronts + backs (front+1) per tag
counts: dict[str, int] = {}
rendered = 0
for tag, fs in fronts.items():
    if not fs:
        continue
    doc = fitz.open(str(PDF_DIR / TAG_PDF[tag]))
    counts[tag] = doc.page_count
    pages = set(fs) | {f + 1 for f in fs if f + 1 < doc.page_count}
    for p in sorted(pages):
        pix = doc[p].get_pixmap(dpi=115)
        (IMG_DIR / f"{tag}_p{p:03d}.jpg").write_bytes(pix.tobytes("jpg", jpg_quality=72))
        rendered += 1
    doc.close()

# attach id + images (front + back)
for i, r in enumerate(records):
    pr = parse_ref(r.get("page_refs") or [])
    charts = r.get("chart_numbers") or []
    if pr:
        tag, f = pr
        r["id"] = f"{tag}_p{f:03d}"
        imgs = [f"img/{tag}_p{f:03d}.jpg"]
        if f + 1 < counts.get(tag, 0):
            imgs.append(f"img/{tag}_p{f + 1:03d}.jpg")
        r["images"] = imgs
        r["image"] = imgs[0]
    elif charts:
        r["id"] = f"chart_{charts[0]}"
        r["images"] = []
        r["image"] = None
    else:
        r["id"] = f"rec_{i:03d}"
        r["images"] = []
        r["image"] = None

(OUT_DIR / "data.json").write_text(json.dumps(records, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"rendered {rendered} page JPEGs (front+back) -> {IMG_DIR.relative_to(ROOT)}")
print(f"wrote data.json with {len(records)} records -> {(OUT_DIR / 'data.json').relative_to(ROOT)}")
two = sum(1 for r in records if len(r.get("images", [])) == 2)
one = sum(1 for r in records if len(r.get("images", [])) == 1)
none = sum(1 for r in records if not r.get("images"))
print(f"  2 images(front+back): {two} | 1 image: {one} | no image(docx): {none}")
