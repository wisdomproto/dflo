# 가짜 투명(체커보드/흰배경 baked) PNG → 진짜 알파 투명.
# 테두리에 연결된 "밝고 무채색" 배경만 제거(연결요소 기반) → 내부 흰색(신발·시계판 등) 보존.
import sys, numpy as np
from PIL import Image
from collections import deque

FILES = [
    "boy-before.png", "boy-after.png", "hourglass.png",
    "signal-iron.png", "signal-hormone.png", "signal-thyroid.png",
    "signal-diet.png", "signal-sleep.png",
]
DIR = "public/casestory/"

def strip(path):
    im = Image.open(path).convert("RGBA")
    a = np.array(im)
    r, g, b = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    # 배경 후보: 밝고(>=205) 무채색(채도 낮음, max-min<=28) — 체커보드 흰/회색 모두 포함
    bg = (mn >= 205) & ((mx - mn) <= 28)
    H, W = bg.shape
    visited = np.zeros_like(bg, dtype=bool)
    dq = deque()
    for x in range(W):
        for y in (0, H - 1):
            if bg[y, x] and not visited[y, x]:
                visited[y, x] = True; dq.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if bg[y, x] and not visited[y, x]:
                visited[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and bg[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True; dq.append((ny, nx))
    # visited = 테두리 연결 배경 → 알파 0
    a[:, :, 3] = np.where(visited, 0, a[:, :, 3])
    removed = int(visited.sum())
    Image.fromarray(a, "RGBA").save(path)
    return removed, H * W

for fn in FILES:
    p = DIR + fn
    rem, tot = strip(p)
    print(f"{fn}: removed {rem*100//tot}% bg")
print("done")
