# 187 리플렛 웹 변환 (docs/Leaflet)

연세새봄의원 **「187 Medical Consulting」 리플렛(PDF 55페이지)** 을 웹 HTML로 변환. 현재 **ko + en 완성**. 다른 언어(th/vi/zh 등) 확장 예정 — **배경은 공유, 텍스트만 번역**하면 됨.

## 아키텍처
- 페이지마다 **배경 이미지(텍스트 제거본) + 절대좌표 텍스트 블록 오버레이** 구조.
  ```
  <section class="page" style="width:793.71px;height:1122.52px">
    <img class="pagebg" src="../shared/img/pXX.webp" ...>
    <div class="blk" data-id="pXX_bNN" style="position:absolute;left/top/width/height;...">번역 텍스트</div>
  </section>
  ```
- 페이지 크기 **793.71 × 1122.52px** (A4 @ 96dpi). 배경 webp는 **1241 × 1754px** (150dpi, CSS 표시폭의 1.5637배).
- **언어별 독립 파일**: `dist/{lang}/index.html` (템플릿 X — 빌드 드라이버 분실). `dist/shared/leaflet.css` 공용, `dist/shared/img/*.webp` 공용.
- 라우팅/배포 미연결 — 정적 파일. 검토는 로컬 서버(`review_server.py`).

## 다른 언어 만드는 법
1. `dist/en/index.html`(또는 ko) 복사 → `dist/{lang}/index.html`, `<html lang>` 교체.
2. 각 `.blk` 텍스트를 번역. **좌표·배경은 그대로** (배경 webp 공유).
3. 번역이 길면 박스 넘침/잘림 발생 → 아래 "검증" + "흔한 이슈" 참고해 폰트/박스 조정.
4. **단어 중간 줄바꿈 금지**는 `leaflet.css`의 `.blk { word-break:keep-all }` 로 전역 처리됨.
5. 일부 페이지는 배경에 **해당 언어 텍스트가 baked**(아웃라인 패스)될 수 있음 → 그 언어 PDF가 따로 있으면 배경 재추출 필요. en/ko는 처리 완료.

## ★ 시각 검증 = 헤드리스 크롬 (필수)
좌표 추론만으론 겹침/잘림을 못 잡음. **실제 렌더를 봐야 함**:
```bash
# 1) ko/index.html 에서 한 섹션만 뽑아 단독 페이지 생성 (python)
#    sec = re.search(r'<section[^>]*>\s*<img[^>]*pXX\.webp.*?</section>', html).group()
#    → dist/_debug/pXX_now.html 로 저장 (leaflet.css 링크 + body.leaflet)
# 2) 헤드리스 크롬 스크린샷
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu \
  --hide-scrollbars --window-size=794,1123 \
  --screenshot=OUT.png "http://localhost:8765/dist/_debug/pXX_now.html"
# 3) Read OUT.png 로 확인, PIL 로 크롭/확대해 정밀 확인
```
서버(`review_server.py`)가 떠 있어야 함(localhost:8765, 정적+/save). 작업 후 `_now.html` 삭제.

## 검토 도구 (사용자 ↔ 나)
- **`review_server.py`** (포트 8765): 정적 서빙 + `POST /save`(수정사항 → `revisions.md`/`.json`) + `GET /api/load`. 실행: `python review_server.py` (백그라운드).
- **`review.html`** (`http://localhost:8765/review.html`): **원본(영어) | 한글 좌우 비교 + 스크롤 동기화**(rAF 폴링, 좁은 패널 맞춤 zoom) + 오른쪽 **페이지별 메모**(스크롤 따라 현재 페이지 카드로 이동). 맨 위 **검토 전달** → `revisions.md` 기록 → 사용자가 "검토 반영해줘" 하면 내가 읽고 적용. iframe은 캐시버스터로 항상 최신 로드.

## 흔한 이슈 & 해결 (다른 언어에도 동일 적용)
- **배경에 baked된 영어/스크림 박스** (텍스트가 PDF에서 아웃라인 패스로 변환되어 "텍스트 숨김" 배경에 남음):
  - **순수 텍스트 박스**(흰/회색 배경 위): PIL로 그 영역을 배경색으로 **흰/회색 덮기** + 누락 번역을 오버레이로 추가. (p15·17·18·19)
  - **사진 위 스크림(글자자리 하이라이트 박스)**: PDF에서 **임베디드 사진 이미지만 추출**(`fitz.Pixmap(doc,xref)` → page rect로 crop+resize)하면 스크림·텍스트 없는 깨끗한 사진. (p08·10·12·34)
  - **아이콘 등 벡터가 사진 위에 있는 경우**(사진만 추출 시 아이콘 손실): 원본과 깨끗본을 **색상 마스크로 합성**(예 파란 배경만 깨끗본 사용). (p14)
- **흰 글씨가 밝은 배경에 묻힘**: `color` 진하게(#084b46) 또는 `text-shadow` 추가. (p13 번호·푸터, p28·29·30·32)
- **번역이 길어 박스 밖 잘림**(keep-all로 단어 안 쪼개짐): 폰트 축소 또는 박스 폭/높이 확대. 전수 스캔으로 `토큰폭 > 박스폭` 블록 검출.
- **여러 줄 박스 세로 잘림**: 높이 부족 → 박스 height 확대 또는 폭 넓혀 줄 수 감소.
- **수치/캡션이 라벨↔값 분리**(추출이 텍스트를 조각냄): 한 블록에 합치거나 ` · ` 구분자.
- **회전 라벨 깨짐**(`rotate(90deg)` + 좁은 폭 + line-height 0.07): 박스 치수를 **회전 전 기준으로 스왑** + `white-space:nowrap` + line-height 1 (중심좌표 유지).
- **사진 위 캡션 겹침**: 사진은 배경 baked라 못 옮김 → 캡션을 사진 사이 여백으로 이동(높이 작게+상단정렬).

## 빌드 드라이버
- `scripts/__pycache__/leaflet_extract.cpython-313.pyc` 는 **텍스트 처리 헬퍼 모듈만**(block_id·normalize_encoding·정렬·줄높이·블록병합). **PDF 렌더·배경생성·HTML빌드 메인 드라이버는 분실**(.pyc도 없음). → 전체 재빌드 불가. **현재 `dist/{ko,en}/index.html` + `shared/` 가 단일 소스**.

## 자산/gitignore
- **커밋**: `dist/{ko,en}/index.html`, `dist/shared/leaflet.css`, `dist/shared/img/*.webp`(55, 5.5M), `review.html`, `review_server.py`, `QA_REPORT.md`.
- **gitignore**: PDF(42M)·`build/`·`dist/_debug/`·`dist/shared/img/*.png`(편집용 로컬 소스 62M)·`dist/shared/img/_orig/`(배경 편집 전 백업)·`__pycache__`·`revisions.*`.
- 배경 편집(덮기/추출) 전 원본은 `dist/shared/img/_orig/` 에 백업됨(로컬).

## QA
- 7개 vision 에이전트 전수 분석 → **`QA_REPORT.md`** (근본원인 5종 + CRITICAL/MAJOR/MINOR 체크리스트). 이후 사용자 검토 라운드를 헤드리스 렌더로 반복 수정해 완성.
- 번역(특히 부작용·Q&A 의료 콘텐츠)은 **원장 감수 권장**(faithful 초안). 화자=남성 의사 격식체.
