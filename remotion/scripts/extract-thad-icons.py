# 태국 광고영상에서 5축 아이콘 원을 떼어낸다 (영어판 ThAdEN 이 쓰는 소재).
#
# 왜 필요한가: 자막 없는 원본(clean)에는 원·아이콘이 아예 없다 — 전부 오버레이다.
#   태국어본을 그대로 깔고 라벨만 덮는 방식은 실패한다. 원이 날아오는 애니메이션이라
#   정착 좌표에 라벨을 고정하면 비행 중 원과 따로 논다(프레임 추적도 비행 구간을 놓친다).
#   → 원+아이콘만 이미지로 떼어내 ThAdEN 이 직접 배치·애니메이션한다.
#
# 산출물은 remotion/public (gitignore) 이므로 원본이 있으면 이 스크립트로 다시 만든다.
#   python scripts/extract-thad-icons.py
from PIL import Image, ImageDraw
import subprocess, os, io

SRC = r"C:\Users\101024\Downloads\태국 광고영상_태국어 나레이션 ver.mp4"
AT = "22.6"                      # 원 5개가 모두 정착한 시각
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "ads", "thad", "icons")

# 정착 좌표(1920x1080 기준) — 태국어본과 clean 을 프레임 차분해 실측한 값
CIRCLES = {
    "medical":   (799, 316, (255, 255, 255)),
    "sleep":     (1118, 316, (92, 61, 83)),
    "nutrition": (799, 596, (255, 255, 255)),
    "posture":   (1118, 595, (255, 255, 255)),
    "exercise":  (959, 839, (92, 61, 83)),
}
R, SS, INNER = 73, 4, 69         # 링(약 3px)은 컴포넌트가 그린다 → 안쪽 원만 떼어낸다

os.makedirs(OUT, exist_ok=True)
raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", AT, "-i", SRC, "-frames:v", "1",
                      "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
frame = Image.open(io.BytesIO(raw)).convert("RGB")

for name, (cx, cy, fill) in CIRCLES.items():
    src = frame.crop((cx - R, cy - R, cx + R, cy + R)).convert("RGBA")
    D = 2 * R * SS
    src = src.resize((D, D), Image.LANCZOS)      # 슈퍼샘플링 → 가장자리 계단현상 제거

    inner = Image.new("L", (D, D), 0)
    off = (R - INNER) * SS
    ImageDraw.Draw(inner).ellipse([off, off, D - 1 - off, D - 1 - off], fill=255)

    # 태국어 라벨을 원 색으로 지운다(원 안쪽 ∩ 중심 아래) — 영어 라벨은 컴포넌트가 올린다
    band = Image.new("L", (D, D), 0)
    ImageDraw.Draw(band).rectangle([0, int(D * 0.53), D, D], fill=255)
    src.paste(Image.new("RGBA", (D, D), fill + (255,)), (0, 0),
              Image.composite(band, Image.new("L", (D, D), 0), inner))

    src.putalpha(inner)                          # 링 바깥 투명
    src.resize((2 * R, 2 * R), Image.LANCZOS).save(os.path.join(OUT, f"{name}.png"))
    print("wrote", name)
