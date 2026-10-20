import type { UploadMeta } from '@/features/intake/types';

// ================================================
// intakeAttachments
// 설문 첨부(피검사 PDF·X-ray 이미지)를 인쇄용 페이지 HTML 로.
// 브라우저 전용 — canvas + pdf.js 를 쓰므로 intakeDoc.ts(순수 빌더)와 분리.
//
// ★왜 래스터(이미지)인가: 브라우저 인쇄는 <embed>/<iframe> 안의 PDF 를 찍어주지
//   않는다. PDF 를 한 문서로 합치려면 각 페이지를 캔버스에 그려 <img> 로 넣는 수밖에.
//   벡터 병합이 필요해지면 서버에서 pdf-lib 등으로 합쳐야 한다.
// ================================================

/** A4 가로 ≈ 150dpi. 피검사 표의 작은 글자가 인쇄에서 읽히는 선. */
const TARGET_WIDTH_PX = 1240;
/** 흰 바탕 텍스트 문서라 JPEG 로 충분(PNG 면 문서 하나가 수 MB). */
const JPEG_QUALITY = 0.82;

function esc(v: unknown): string {
  return String(v ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}

function page(caption: string, src: string): string {
  return `<figure class="att"><figcaption>${esc(caption)}</figcaption><img src="${esc(src)}" alt=""></figure>`;
}

/** PDF 1건 → 페이지마다 JPEG dataURL <figure>. */
async function pdfToPages(bytes: ArrayBuffer, filename: string): Promise<string> {
  // 번들을 가볍게 두려고 지연 로드(어드민 첫 로딩에 pdf.js 를 싣지 않는다).
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    // ★`new URL('pdfjs-dist/...', import.meta.url)` 는 Vite 가 못 푼다(상대경로만 처리).
    //   워커는 `?url` 로 받아야 dev·build 양쪽에서 해석된다.
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const out: string[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n += 1) {
      const pdfPage = await doc.getPage(n);
      const base = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: TARGET_WIDTH_PX / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) break;
      // 투명 배경이 JPEG 에서 검게 나오므로 흰 바탕을 먼저 깐다.
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // ★`intent: 'print'` 필수 — 기본(display) 렌더는 requestAnimationFrame 으로 돌아서
      //   탭이 백그라운드로 가면 rAF 가 멈추고 render 가 **에러 없이 영원히 매달린다**
      //   (출력 눌러놓고 다른 탭 보면 그대로 멈춤). print 인텐트는 rAF 를 안 쓴다.
      await pdfPage.render({ canvas, canvasContext: ctx, viewport, intent: 'print' }).promise;
      const label = doc.numPages > 1 ? `${filename} (${n}/${doc.numPages})` : filename;
      out.push(page(label, canvas.toDataURL('image/jpeg', JPEG_QUALITY)));
      pdfPage.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return out.join('');
}

/**
 * 첨부 목록 → 인쇄용 페이지 HTML. 실패한 첨부는 건너뛰고 안내 줄만 남긴다
 * (하나가 깨졌다고 문진 인쇄 전체를 막지 않는다).
 * @param signedUrls intake-uploads 서명 URL 맵 (path → url)
 */
export async function buildAttachmentPagesHtml(
  uploads: UploadMeta[],
  signedUrls: Record<string, string>,
): Promise<string> {
  const out: string[] = [];
  for (const u of uploads) {
    const url = signedUrls[u.path];
    if (!url) {
      out.push(`<p class="att-miss">첨부를 불러오지 못했습니다 — ${esc(u.filename)}</p>`);
      continue;
    }
    try {
      if (u.contentType?.startsWith('image/')) {
        // 이미지는 서명 URL 그대로(인쇄 창이 직접 로드) — base64 로 부풀릴 이유가 없다.
        out.push(page(u.filename, url));
        continue;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      out.push(await pdfToPages(await res.arrayBuffer(), u.filename));
    } catch {
      out.push(`<p class="att-miss">첨부를 불러오지 못했습니다 — ${esc(u.filename)}</p>`);
    }
  }
  return out.join('');
}

/** 인쇄 창의 모든 이미지가 디코드될 때까지 대기(안 하면 빈 페이지가 찍힌다). */
export function waitForImages(doc: Document, timeoutMs = 15000): Promise<void> {
  const imgs = Array.from(doc.images);
  const pending = imgs
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    );
  if (!pending.length) return Promise.resolve();
  return Promise.race([
    Promise.all(pending).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
