"""OCR batch runner: runs EasyOCR on every lab image and caches raw output.

Usage:
    python ocr_batch.py              # process all patients
    python ocr_batch.py 5368 22028   # only given chart numbers

Raw per-image OCR is saved to cases/랩데이터_ocr/_raw/{chart}/{image}.raw.json
so the expensive OCR step runs once; parsing can iterate cheaply.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image
import easyocr

ROOT = Path(r"C:/projects/dflo_0.1/cases/랩데이터")
OUT_RAW = Path(r"C:/projects/dflo_0.1/cases/랩데이터_ocr/_raw")
OUT_RAW.mkdir(parents=True, exist_ok=True)


def ocr_image(reader: easyocr.Reader, img_path: Path) -> list[dict]:
    """Run OCR, return list of {bbox:[x1,y1,x2,y2], text, conf}."""
    img = np.array(Image.open(img_path).convert("RGB"))
    raw = reader.readtext(
        img, detail=1, paragraph=False,
        text_threshold=0.5, low_text=0.3, link_threshold=0.3,
    )
    out = []
    for bbox, text, conf in raw:
        xs = [p[0] for p in bbox]
        ys = [p[1] for p in bbox]
        out.append({
            "bbox": [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))],
            "text": text,
            "conf": float(conf),
        })
    return out


def process_patient(reader: easyocr.Reader, chart_dir: Path) -> tuple[int, int]:
    """Process every image in chart_dir. Returns (processed, skipped) counts."""
    chart = chart_dir.name
    out_dir = OUT_RAW / chart
    out_dir.mkdir(parents=True, exist_ok=True)

    images = sorted(chart_dir.glob("*.jpg")) + sorted(chart_dir.glob("*.jpeg")) + sorted(chart_dir.glob("*.png"))
    processed = 0
    skipped = 0
    for img in images:
        out_path = out_dir / f"{img.stem}.raw.json"
        if out_path.exists():
            skipped += 1
            continue
        t0 = time.time()
        lines = ocr_image(reader, img)
        out_path.write_text(json.dumps(lines, ensure_ascii=False, indent=2), encoding="utf-8")
        dt = time.time() - t0
        processed += 1
        print(f"  {img.name}: {len(lines)} lines ({dt:.1f}s)")
    return processed, skipped


def main(argv: list[str]) -> None:
    charts = argv[1:] if len(argv) > 1 else None

    print("Loading EasyOCR (ko + en, CPU) ...")
    reader = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
    print("Ready.")

    all_dirs = sorted([p for p in ROOT.iterdir() if p.is_dir()])
    if charts:
        all_dirs = [p for p in all_dirs if p.name in charts]

    total_proc = 0
    total_skip = 0
    t_start = time.time()
    for i, d in enumerate(all_dirs, 1):
        print(f"[{i}/{len(all_dirs)}] {d.name}")
        proc, skip = process_patient(reader, d)
        total_proc += proc
        total_skip += skip

    dt = time.time() - t_start
    print(f"\nDone: {total_proc} images processed, {total_skip} cached, in {dt:.1f}s")


if __name__ == "__main__":
    main(sys.argv)
