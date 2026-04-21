"""Run EasyOCR on one image, dump raw result to UTF-8 JSON for inspection."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
import easyocr

IMG = Path(r"C:/projects/dflo_0.1/cases/랩데이터/5368/5368_01.jpg")
OUT = Path(r"C:/projects/dflo_0.1/cases/5368_01.raw.json")

reader = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
img = np.array(Image.open(IMG).convert("RGB"))

# Lower text_threshold + low_text to catch faint single values like "6.03"
results = reader.readtext(
    img, detail=1, paragraph=False,
    text_threshold=0.5, low_text=0.3, link_threshold=0.3,
)

lines = []
for bbox, text, conf in results:
    xs = [p[0] for p in bbox]
    ys = [p[1] for p in bbox]
    lines.append({
        "bbox": [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))],
        "text": text,
        "conf": float(conf),
    })

OUT.write_text(json.dumps(lines, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"wrote {len(lines)} lines to {OUT}")
