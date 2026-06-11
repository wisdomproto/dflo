# cases/extract_book.py — 「우리 아이 키 성장 바이블」 PDF → 장 태그 청크 JSON.
#   chunk_text: 순수(테스트 대상). extract: PDF I/O. 생성(LLM) 없음.
# 사용: python extract_book.py "<PDF 경로>"  → cases/book-chunks.json
import sys, os, json, re

SOURCE = "우리 아이 키 성장 바이블"
AUTHOR = "채용현 (원장)"

def chunk_text(text, size=800, overlap=120):
    """문장 경계로 ~size 청크 분할, 인접 청크 끝 overlap 글자 carry. 순수함수.
    size 보다 긴 단일 문장(종결부호 없는 목록·표·인용 등)은 size 단위로 하드 분할해
    size 계약을 지킨다 (PDF 추출 텍스트는 종결부호 없는 긴 줄이 종종 나옴)."""
    text = (text or "").strip()
    if not text:
        return []
    sentences = re.split(r'(?<=[.!?。！？])\s+', text)
    flat = []
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        while len(s) > size:                  # 초과 문장은 size 단위 하드 분할
            flat.append(s[:size])
            s = s[size:]
        if s:
            flat.append(s)
    sentences = flat
    chunks, cur = [], ""
    for s in sentences:
        if cur and len(cur) + 1 + len(s) > size:
            chunks.append(cur)
            cur = (cur[-overlap:] + " " + s).strip() if overlap else s
        else:
            cur = (cur + " " + s).strip() if cur else s
    if cur:
        chunks.append(cur)
    return chunks

def clean_page(text):
    """선두 페이지번호 라인·러닝헤더('N장｜...') 제거."""
    out = []
    for ln in text.split("\n"):
        s = ln.strip()
        if re.fullmatch(r'\d{1,3}', s):       # 페이지번호
            continue
        if re.match(r'^\d+\s*장\s*[｜|]', s):  # 러닝헤더
            continue
        out.append(ln)
    return "\n".join(out)

def extract(pdf_path):
    import fitz
    doc = fitz.open(pdf_path)
    # 본문 p17~255 (0-based 16..254). 앞표지/일러두기·참고문헌·판권 제외.
    chapters, current_chapter, buf = [], "서장", []
    for i in range(16, min(255, doc.page_count)):
        raw = doc[i].get_text()
        if not raw.strip():
            continue
        hm = re.search(r'^(\d+\s*장\s*[｜|][^\n]+)', raw, re.MULTILINE)   # 라인 선두 러닝헤더로 현재 장 추적(본문 내 상호참조 오탐 방지)
        if hm:
            ch = re.sub(r'\s+', ' ', hm.group(1)).strip()
            if ch != current_chapter:
                if buf:
                    chapters.append((current_chapter, "\n".join(buf)))
                    buf = []
                current_chapter = ch
        text = clean_page(raw)
        if len(text.strip()) >= 40:           # 타이틀/근빈 페이지 skip
            buf.append(text)
    if buf:
        chapters.append((current_chapter, "\n".join(buf)))
    out, idx = [], 0
    for chapter, text in chapters:
        for ch in chunk_text(text):
            out.append({"source": SOURCE, "author": AUTHOR, "chapter": chapter,
                        "chunk_index": idx, "content": ch})
            idx += 1
    return out

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("usage: python extract_book.py <PDF 경로>"); sys.exit(1)
    chunks = extract(sys.argv[1])
    dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "book-chunks.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
    # 장별 분포 출력 (검수용)
    from collections import Counter
    dist = Counter(c["chapter"] for c in chunks)
    print(f"extracted {len(chunks)} chunks → {dest}")
    for ch, n in dist.items():
        print(f"  {n:3d}  {ch[:40]}")
