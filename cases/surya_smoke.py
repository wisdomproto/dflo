"""Surya smoke test: run on one eone report, dump lines with bbox + confidence."""
import json
import time
from pathlib import Path
from PIL import Image
from surya.foundation import FoundationPredictor
from surya.recognition import RecognitionPredictor
from surya.detection import DetectionPredictor

IMG = Path(r"C:/projects/dflo_0.1/cases/랩데이터/12740/12740_01.jpg")
OUT = Path(r"C:/projects/dflo_0.1/cases/12740_01.surya.json")

print("Loading Surya models...")
t0 = time.time()
foundation = FoundationPredictor()
rec = RecognitionPredictor(foundation)
det = DetectionPredictor()
print(f"Models loaded in {time.time()-t0:.1f}s")

image = Image.open(IMG).convert("RGB")
print(f"Image: {image.size}")

t0 = time.time()
predictions = rec([image], det_predictor=det)
print(f"Inference: {time.time()-t0:.1f}s")

pred = predictions[0]  # single-image result

# Structure: OCRResult with text_lines list, each has bbox + text + confidence
lines = []
for tl in pred.text_lines:
    lines.append({
        "bbox": [int(v) for v in tl.bbox],  # [x1,y1,x2,y2]
        "text": tl.text,
        "conf": float(tl.confidence) if tl.confidence is not None else None,
    })

OUT.write_text(json.dumps(lines, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {len(lines)} lines to {OUT}")
