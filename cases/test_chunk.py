# cases/test_chunk.py — chunk_text 단위테스트 (plain assert, no pytest 의존)
from extract_book import chunk_text

assert chunk_text("") == [], "empty"
assert chunk_text("   ") == [], "whitespace"
assert chunk_text("한 문장입니다.") == ["한 문장입니다."], "short single"

long = " ".join([f"이것은 {i}번째 테스트 문장입니다." for i in range(100)])
cs = chunk_text(long, size=400, overlap=50)
assert len(cs) >= 3, f"expected >=3 chunks, got {len(cs)}"
assert all(c.strip() for c in cs), "no empty chunks"
assert all(len(c) <= 470 for c in cs), f"chunk too big: {max(len(c) for c in cs)}"
assert "0번째" in cs[0], "first sentence in first chunk"
assert "99번째" in cs[-1], "last sentence in last chunk"

# 종결부호 없는 size 초과 단일 "문장" → size 단위 하드 분할 (목록/표/인용 방어)
huge = "가" * 2000
hc = chunk_text(huge, size=400, overlap=50)
assert len(hc) >= 4, f"huge: expected >=4 chunks, got {len(hc)}"
assert all(c.strip() for c in hc), "huge: no empty chunks"
assert all(len(c) <= 470 for c in hc), f"huge chunk too big: {max(len(c) for c in hc)}"

print("chunk_text OK", len(cs), "chunks /", len(hc), "huge")
