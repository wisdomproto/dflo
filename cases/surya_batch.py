"""Surya batch OCR runner.

Loads Surya models once, processes every image in 랩데이터/*/*.jpg,
writes per-image raw JSON to 랩데이터_ocr/_raw/{chart}/{image}.raw.json.
Skips images that already have a cached raw JSON.

Usage:
    python surya_batch.py              # all patients
    python surya_batch.py 5368 22028   # only given chart numbers
    python surya_batch.py --refresh 5368   # force re-OCR
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from PIL import Image
import torch
from surya.foundation import FoundationPredictor
from surya.recognition import RecognitionPredictor
from surya.detection import DetectionPredictor

ROOT = Path(r"C:/projects/dflo_0.1/cases/랩데이터")
OUT_RAW = Path(r"C:/projects/dflo_0.1/cases/랩데이터_ocr/_raw")
OUT_RAW.mkdir(parents=True, exist_ok=True)

BATCH = 4  # images per Surya call — lower to avoid VRAM fragmentation hangs


def collect_pending(charts: list[str] | None, refresh: bool) -> list[tuple[Path, Path]]:
    """Return list of (image_path, out_path) pairs that need OCR."""
    dirs = sorted([p for p in ROOT.iterdir() if p.is_dir()])
    if charts:
        dirs = [p for p in dirs if p.name in charts]
    pending: list[tuple[Path, Path]] = []
    for d in dirs:
        out_dir = OUT_RAW / d.name
        out_dir.mkdir(parents=True, exist_ok=True)
        for img in sorted(list(d.glob("*.jpg")) + list(d.glob("*.jpeg")) + list(d.glob("*.png"))):
            out_path = out_dir / f"{img.stem}.raw.json"
            if out_path.exists() and not refresh:
                continue
            pending.append((img, out_path))
    return pending


def run_batch(rec, det, images: list[Image.Image]) -> list[list[dict]]:
    """Run OCR on a batch of images, return per-image line lists."""
    # Cap internal batch sizes — Surya's defaults can freeze on VRAM-constrained
    # Windows/CUDA builds when a document has 500+ text lines.
    preds = rec(
        images,
        det_predictor=det,
        detection_batch_size=4,
        recognition_batch_size=16,
    )
    batch_out = []
    for p in preds:
        lines = []
        for tl in p.text_lines:
            lines.append({
                "bbox": [int(v) for v in tl.bbox],
                "text": tl.text,
                "conf": float(tl.confidence) if tl.confidence is not None else None,
            })
        batch_out.append(lines)
    return batch_out


def main(argv: list[str]) -> None:
    args = argv[1:]
    refresh = False
    if "--refresh" in args:
        refresh = True
        args.remove("--refresh")
    charts = args if args else None

    pending = collect_pending(charts, refresh)
    if not pending:
        print("Nothing to do — all images already cached.")
        return
    print(f"{len(pending)} images to OCR.")

    print("Loading Surya models...")
    t0 = time.time()
    foundation = FoundationPredictor()
    rec = RecognitionPredictor(foundation)
    det = DetectionPredictor()
    print(f"Models loaded in {time.time()-t0:.1f}s")

    t_start = time.time()
    done = 0
    for i in range(0, len(pending), BATCH):
        batch = pending[i:i + BATCH]
        images = [Image.open(p).convert("RGB") for p, _ in batch]
        t_batch = time.time()
        try:
            results = run_batch(rec, det, images)
        except Exception as e:
            print(f"  BATCH FAILED ({len(batch)} imgs): {e}")
            # Fallback: one at a time
            results = []
            for im in images:
                try:
                    r = run_batch(rec, det, [im])[0]
                except Exception as e2:
                    print(f"    skip: {e2}")
                    r = []
                results.append(r)
        for (img_path, out_path), lines in zip(batch, results):
            out_path.write_text(json.dumps(lines, ensure_ascii=False, indent=2), encoding="utf-8")
        # Free VRAM fragmentation between batches — without this, Surya hangs
        # after the first batch on some Windows/CUDA builds.
        del images, results
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        done += len(batch)
        dt_batch = time.time() - t_batch
        dt_total = time.time() - t_start
        rate = done / dt_total if dt_total > 0 else 0
        eta = (len(pending) - done) / rate if rate > 0 else 0
        print(f"  [{done}/{len(pending)}] {dt_batch:.1f}s/batch - {rate:.1f} img/s - ETA {eta/60:.1f}min", flush=True)

    print(f"\nDone in {(time.time()-t_start)/60:.1f}min")


if __name__ == "__main__":
    main(sys.argv)
