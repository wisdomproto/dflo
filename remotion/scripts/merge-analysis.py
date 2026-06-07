# 제목 카테고리(내용) + 얼굴검출 frac(시각 포맷) 결합 → 영상별 '제작 방식' 도출.
# 얼굴 검출만으론 연예인 몽타주를 토킹헤드로 오인 → 제목 카테고리로 교정.
import json, os
from collections import Counter

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sources", "originals"))
rows = json.load(open(os.path.join(SRC, "_analysis.json"), encoding="utf-8"))

NAMES = ["이병헌", "장원영", "안유진", "김태리", "한혜진", "주원", "송지아", "정시아", "김연경",
         "고경표", "신유", "Haaland", "Hitler", "Danish", "idol", "Idol", "Generation", "Actress",
         "Actresses", "Singers", "Misconception", "Explicit", "Bean Sprouts", "Go Kyung", "Kim Yeon",
         "Kim Tae", "Shin Yu", "남돌", "여돌", "걸그룹", "배우들", "남자 배우", "사지연장술", "워크샵"]


def tcat(t):
    if "마사지" in t or "교정하는" in t or "교정✔" in t:
        return "EX"
    if ("187성장클리닉" not in t) and ("187GrowthClinic" not in t):
        return "LIST"
    if any(n in t for n in NAMES):
        return "LIST"
    return "DOC"


def treat(tc, frac):
    frac = frac if frac is not None else 0
    if tc == "EX":
        return "💪운동", "자막+클론음성 (동작 위주)"
    if tc == "LIST":
        return "📋몽타주", "클론음성+자막 현지화 (립싱크X)"
    if frac >= 0.7:
        return "🎙️토킹헤드", "풀파이프라인 클론+립싱크 ⭐"
    if frac < 0.5:
        return "🔊보이스오버", "클론음성+자막 (립싱크X)"
    return "🔀혼합", "부분 립싱크 (검토필요)"


for r in rows:
    r["tcat"] = tcat(r["title"])
    emo, how = treat(r["tcat"], r.get("frac"))
    r["mode"] = emo
    r["how"] = how

rows.sort(key=lambda r: -(r["views"] or 0))
json.dump(rows, open(os.path.join(SRC, "_final.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

c = Counter(r["mode"] for r in rows)
L = ["제작방식 분류 (제목내용 + 얼굴검출 결합):",
     f"  🎙️토킹헤드(풀파이프라인) {c['🎙️토킹헤드']} · 🔊보이스오버 {c['🔊보이스오버']} · 🔀혼합 {c['🔀혼합']} · 💪운동 {c['💪운동']} · 📋몽타주 {c['📋몽타주']}",
     f"  (총 {len(rows)})", ""]
for rk, r in enumerate(rows, 1):
    t = r["title"]
    t = t if len(t) <= 46 else t[:45] + "…"
    dur = f"{r['dur']}s" if r.get("dur") else "?"
    L.append(f"{rk:2d}. {r['mode']:9} {r['views']:>7,}회 {dur:>5} [{r['id']}] {t}")
open(os.path.join(SRC, "_final.txt"), "w", encoding="utf-8").write("\n".join(L) + "\n")
print("OK", len(rows))
