# 쇼츠 포맷 자동 분석 — 각 영상에서 프레임 샘플링 → mediapipe 얼굴 검출 →
# 얼굴 등장 비율(frac)로 토킹헤드 / 혼합 / 몽타주 분류. (립싱크 적합도 판단용)
# 실행: <lipsync venv python> scripts/analyze-shorts.py
import cv2, json, glob, os, statistics
import mediapipe as mp

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sources", "originals"))
N = 12  # 샘플 프레임 수
mpfd = mp.solutions.face_detection


def analyze(path, fd):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        return None
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if total <= 0:
        cap.release(); return None
    idxs = [int(total * (i + 0.5) / N) for i in range(N)]
    nface = 0; areas = []; cx = []; cy = []
    for fi in idxs:
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
        ok, frame = cap.read()
        if not ok:
            continue
        fh, fw = frame.shape[:2]
        sm = cv2.resize(frame, (480, int(fh * 480.0 / fw)))
        res = fd.process(cv2.cvtColor(sm, cv2.COLOR_BGR2RGB))
        if res.detections:
            best = 0; bc = None
            for d in res.detections:
                b = d.location_data.relative_bounding_box
                a = max(0, b.width) * max(0, b.height)
                if a > best:
                    best = a; bc = (b.xmin + b.width / 2, b.ymin + b.height / 2)
            if best > 0:
                nface += 1; areas.append(best)
                if bc:
                    cx.append(bc[0]); cy.append(bc[1])
    cap.release()
    frac = nface / N
    area = statistics.median(areas) if areas else 0.0
    stab = (statistics.pstdev(cx) + statistics.pstdev(cy)) / 2 if len(cx) >= 2 else None
    return dict(w=w, h=h, frac=round(frac, 2), area=round(area, 3),
                stab=round(stab, 3) if stab is not None else None, nface=nface)


def classify(a):
    if a is None:
        return "ERROR"
    if a["frac"] >= 0.7 and a["area"] >= 0.02:
        return "TALKING"
    if a["frac"] < 0.35:
        return "MONTAGE"
    return "MIXED"


def main():
    fd = mpfd.FaceDetection(model_selection=1, min_detection_confidence=0.5)
    mp4s = sorted(glob.glob(os.path.join(SRC, "*.mp4")))
    rows = []
    for i, p in enumerate(mp4s, 1):
        vid = os.path.splitext(os.path.basename(p))[0]
        ip = os.path.join(SRC, vid + ".info.json")
        title = ""; views = 0; dur = None
        if os.path.exists(ip):
            d = json.load(open(ip, encoding="utf-8"))
            title = (d.get("title") or "").strip(); views = d.get("view_count") or 0; dur = d.get("duration")
        a = analyze(p, fd)
        cls = classify(a)
        rows.append(dict(id=vid, title=title, views=views, dur=dur, cls=cls, **(a or {})))
        print(f'[{i}/{len(mp4s)}] {cls:8} frac={a["frac"] if a else "-"} area={a["area"] if a else "-"} dur={dur} {vid}', flush=True)
    rows.sort(key=lambda r: -(r["views"] or 0))
    json.dump(rows, open(os.path.join(SRC, "_analysis.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    from collections import Counter
    c = Counter(r["cls"] for r in rows)
    EMO = {"TALKING": "🎙️TALK", "MONTAGE": "📋MONT", "MIXED": "🔀MIX", "ERROR": "❌ERR"}
    L = [f"포맷: 🎙️토킹헤드 {c['TALKING']} · 🔀혼합 {c['MIXED']} · 📋몽타주 {c['MONTAGE']} · ❌에러 {c['ERROR']}  (총 {len(rows)})", ""]
    for rk, r in enumerate(rows, 1):
        t = r["title"]; t = t if len(t) <= 48 else t[:47] + "…"
        dur = f"{r['dur']}s" if r["dur"] else "?"
        L.append(f"{rk:2d}. {EMO[r['cls']]} {r['views']:>7,}회 {dur:>5} f{r.get('frac','-')} [{r['id']}] {t}")
    open(os.path.join(SRC, "_analysis.txt"), "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("DONE", len(rows))


main()
