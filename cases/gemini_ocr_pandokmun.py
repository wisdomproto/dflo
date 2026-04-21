"""Gemini Vision OCR for handwritten clinical records (판독문).

Each image is a form with:
  - Date column (left, handwritten dates like "20 11/14", "21 2/20")
  - Progress & Treatment column (right, handwritten notes like "C.C.", heights
    "170.1 / 65kg", Korean phrases)

We ask Gemini to transcribe EACH ROW faithfully, preserving date + notes as
separate fields, without interpretation or cleanup. Data cleaning happens later.

Output:
  cases/판독문_ocr/{chart}/{image_stem}.txt   # human-readable transcription
  cases/판독문_ocr/{chart}/{image_stem}.json  # structured rows

Usage:
  python gemini_ocr_pandokmun.py                    # all patients
  python gemini_ocr_pandokmun.py 12740 22028        # specific charts
  python gemini_ocr_pandokmun.py --force 12740      # re-run even if cached
  python gemini_ocr_pandokmun.py --workers 6        # concurrency
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import os
import sys
import time
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv

ROOT = Path(r"C:/projects/dflo_0.1/cases/판독문")
OUT_ROOT = Path(r"C:/projects/dflo_0.1/cases/판독문_ocr")
OUT_ROOT.mkdir(parents=True, exist_ok=True)

MODEL_NAME = "gemini-2.5-flash"

PROMPT = """이 이미지는 연세새봄의원의 손글씨 진료 기록지(CLINICAL RECORDS)입니다.

각 가로줄은 한 번의 진료 기록이며, 두 컬럼으로 구성됩니다:
  1) Date   : 손글씨 날짜 (예: "20 11/14", "21 2/20", "22.3.5" 등 여러 형식)
  2) Progress & Treatment : 손글씨 메모 (C.C., 키/몸무게 "170.1/65kg", 한글 메모 등)

다음 규칙에 따라 **원문 그대로** 전사하세요:
- 해석하거나 고치지 말 것. 판독이 불확실하면 `?` 로 표기.
- 빈 줄은 건너뛰되, 한 쪽만 쓰여 있는 경우 나머지는 빈 문자열.
- 날짜 형식은 손으로 쓴 그대로 유지 (예: "20 11/14" 를 "2020-11-14" 로 바꾸지 말 것).
- 키/몸무게의 슬래시, 단위(kg), 소수점 그대로 유지.
- 여러 줄에 걸쳐 쓰인 메모는 개행 문자 `\\n` 으로 합쳐서 notes 한 필드에 넣기.
- 줄 순서는 위에서 아래 순서.

반드시 아래 JSON 스키마로만 답하세요 (코드 블록 없이, JSON 객체 하나만):
{
  "rows": [
    { "date": "…", "notes": "…" },
    …
  ]
}
"""

GENERATION_CONFIG = {
    "temperature": 0.0,
    "response_mime_type": "application/json",
}


def load_key() -> str:
    load_dotenv(Path(r"C:/projects/dflo_0.1/ai-server/.env"))
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY not found in ai-server/.env")
    return key


def ocr_one(model: genai.GenerativeModel, img_path: Path) -> dict:
    img_bytes = img_path.read_bytes()
    mime = "image/png" if img_path.suffix.lower() == ".png" else "image/jpeg"
    resp = model.generate_content(
        [
            {"mime_type": mime, "data": img_bytes},
            PROMPT,
        ],
        generation_config=GENERATION_CONFIG,
    )
    text = resp.text.strip()
    data = json.loads(text)
    rows = data.get("rows", [])
    if not isinstance(rows, list):
        raise ValueError(f"rows is not a list: {type(rows)}")
    return {"rows": rows, "raw": text}


def transcription_to_plain_text(rows: list[dict]) -> str:
    """Human-readable: '<date>\\t<notes>' with notes newlines indented."""
    out = []
    for r in rows:
        date = (r.get("date") or "").strip()
        notes = (r.get("notes") or "").strip()
        if not date and not notes:
            continue
        first_line, *rest = notes.split("\n") if notes else [""]
        out.append(f"{date}\t{first_line}")
        for line in rest:
            out.append(f"\t{line}")
    return "\n".join(out) + ("\n" if out else "")


def process_image(
    model: genai.GenerativeModel, img_path: Path, out_dir: Path, force: bool
) -> tuple[str, str]:
    """Returns (status, message). status in {'ok','skip','err'}"""
    json_out = out_dir / f"{img_path.stem}.json"
    txt_out = out_dir / f"{img_path.stem}.txt"
    if json_out.exists() and txt_out.exists() and not force:
        return "skip", f"cached {img_path.name}"

    for attempt in range(3):
        try:
            result = ocr_one(model, img_path)
            rows = result["rows"]
            json_out.write_text(
                json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            txt_out.write_text(transcription_to_plain_text(rows), encoding="utf-8")
            return "ok", f"{img_path.name} -> {len(rows)} rows"
        except Exception as e:
            if attempt == 2:
                return "err", f"{img_path.name}: {type(e).__name__}: {e}"
            time.sleep(2 * (attempt + 1))
    return "err", f"{img_path.name}: unknown"


def process_patient(
    model: genai.GenerativeModel, chart_dir: Path, force: bool, workers: int
) -> tuple[int, int, int]:
    out_dir = OUT_ROOT / chart_dir.name
    out_dir.mkdir(parents=True, exist_ok=True)

    images = (
        sorted(chart_dir.glob("*.png"))
        + sorted(chart_dir.glob("*.jpg"))
        + sorted(chart_dir.glob("*.jpeg"))
    )
    ok = skip = err = 0
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(process_image, model, img, out_dir, force): img for img in images}
        for fut in cf.as_completed(futures):
            status, msg = fut.result()
            if status == "ok":
                ok += 1
            elif status == "skip":
                skip += 1
            else:
                err += 1
            tag = {"ok": "[OK]", "skip": "[--]", "err": "[XX]"}[status]
            print(f"  {tag} {msg}")
    return ok, skip, err


def main(argv: list[str]) -> None:
    p = argparse.ArgumentParser()
    p.add_argument("charts", nargs="*", help="specific chart numbers (default: all)")
    p.add_argument("--force", action="store_true", help="re-run even if output exists")
    p.add_argument("--workers", type=int, default=4, help="parallel requests per patient")
    args = p.parse_args(argv[1:])

    genai.configure(api_key=load_key())
    model = genai.GenerativeModel(MODEL_NAME)

    all_dirs = sorted([p for p in ROOT.iterdir() if p.is_dir()])
    if args.charts:
        wanted = set(args.charts)
        all_dirs = [p for p in all_dirs if p.name in wanted]

    print(f"Model: {MODEL_NAME}  patients: {len(all_dirs)}  workers: {args.workers}")
    print(f"Output: {OUT_ROOT}\n")

    t0 = time.time()
    tot_ok = tot_skip = tot_err = 0
    for i, d in enumerate(all_dirs, 1):
        print(f"[{i}/{len(all_dirs)}] {d.name}")
        ok, skip, err = process_patient(model, d, args.force, args.workers)
        tot_ok += ok
        tot_skip += skip
        tot_err += err

    dt = time.time() - t0
    print(
        f"\nDone: ok={tot_ok} skip={tot_skip} err={tot_err}  elapsed {dt:.1f}s"
    )


if __name__ == "__main__":
    main(sys.argv)
