"""리플렛 편집본(docs/Leaflet/dist) → 서빙 위치(v4/public/leaflet) 동기화.
마케팅 사이드바 '리플렛' 뷰어가 /leaflet/{lang}/index.html 을 iframe 으로 띄움.
리플렛 수정/새 언어 추가 후 실행: python docs/Leaflet/sync-to-public.py
"""
import os, shutil, glob

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "dist")
DST = os.path.abspath(os.path.join(HERE, "..", "..", "v4", "public", "leaflet"))

def main():
    os.makedirs(os.path.join(DST, "shared", "img"), exist_ok=True)
    # 1) 언어별 index.html (존재하는 언어 폴더 전부)
    langs = []
    for d in sorted(os.listdir(SRC)):
        idx = os.path.join(SRC, d, "index.html")
        if d not in ("shared", "_debug") and os.path.isfile(idx):
            os.makedirs(os.path.join(DST, d), exist_ok=True)
            shutil.copy2(idx, os.path.join(DST, d, "index.html"))
            langs.append(d)
    # 2) 공용 CSS
    shutil.copy2(os.path.join(SRC, "shared", "leaflet.css"),
                 os.path.join(DST, "shared", "leaflet.css"))
    # 3) 배경 webp (png/_orig 제외)
    n = 0
    for p in glob.glob(os.path.join(SRC, "shared", "img", "*.webp")):
        shutil.copy2(p, os.path.join(DST, "shared", "img", os.path.basename(p)))
        n += 1
    print(f"동기화 완료: 언어 {langs} · webp {n}장 → {DST}")
    print("⚠️ LeafletViewer.tsx 의 LANGS[].ready 도 새 언어에 맞춰 true 로 갱신할 것")

if __name__ == "__main__":
    main()
