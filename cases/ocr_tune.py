"""Test different EasyOCR tuning on a single image, print only the result column."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
import easyocr

IMG = Path(r"C:/projects/dflo_0.1/cases/랩데이터/12740/12740_01.jpg")
img_pil = Image.open(IMG).convert("RGB")

reader = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)

configs = [
    {"name": "default"},
    {"name": "mag2",       "mag_ratio": 2.0},
    {"name": "upscale2x",  "mag_ratio": 1.0, "_upscale": 2},
    {"name": "loose",      "text_threshold": 0.3, "low_text": 0.2, "link_threshold": 0.2, "mag_ratio": 2.0},
]

for cfg in configs:
    img = img_pil
    if cfg.get("_upscale"):
        img = img.resize((img.width * cfg["_upscale"], img.height * cfg["_upscale"]), Image.LANCZOS)
    img_np = np.array(img)
    kwargs = {k: v for k, v in cfg.items() if k not in ("name", "_upscale")}
    kwargs.setdefault("detail", 1)
    kwargs.setdefault("paragraph", False)
    results = reader.readtext(img_np, **kwargs)
    # Scale factor so bboxes compare to original
    sf = cfg.get("_upscale", 1)
    # Show only result column (xc 400-520 in original coords → 400*sf to 520*sf scaled)
    lo, hi = 400 * sf, 520 * sf
    print(f"\n=== {cfg['name']} ({len(results)} total lines) ===")
    for bbox, text, conf in results:
        xs = [p[0] for p in bbox]
        ys = [p[1] for p in bbox]
        xc = (min(xs) + max(xs)) / 2
        yc = (min(ys) + max(ys)) / 2
        if lo <= xc <= hi and 200 * sf <= yc <= 900 * sf:
            print(f"  y={int(yc/sf):4d} conf={conf:.2f} | {text!r}")
