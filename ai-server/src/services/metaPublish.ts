// Graph v21.0 발행. 반환: postId 또는 throw(Graph 에러 메시지).
const GRAPH = 'https://graph.facebook.com/v21.0';

async function gpost(path: string, body: Record<string, unknown>): Promise<{ id: string }> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { id?: string; error?: Record<string, unknown> };
  if (json.error) {
    console.error('[meta/graph] POST', path.split('?')[0], '→', JSON.stringify(json.error));
    const e = json.error;
    throw new Error(String(e['error_user_msg'] || e['message'] || 'Graph 오류'));
  }
  return { id: json.id || '' };
}

// 컨테이너 처리 완료까지 폴링. 이미지/영상 fetch+처리에 시간이 걸려서, 즉시 media_publish 하면
// "Media ID is not available" 가 남 → FINISHED 될 때까지 대기.
// IG 는 status_code(enum), Threads 는 status(enum) 필드를 씀 → 둘 다 확인.
// 영상은 처리가 길어 maxAttempts 를 늘려 호출(이미지=20≈30s, 영상=40≈60s).
async function waitMediaReady(containerId: string, token: string, maxAttempts = 20): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${GRAPH}/${containerId}?fields=status_code,status&access_token=${token}`);
    const j = (await res.json()) as { status_code?: string; status?: string };
    const code = j.status_code || j.status; // IG=status_code, Threads=status
    if (code === 'FINISHED') return;
    if (code === 'ERROR' || code === 'EXPIRED') throw new Error(`미디어 처리 실패: ${j.status || code || 'ERROR'}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('미디어 처리 타임아웃(컨테이너 준비 안 됨)');
}

export async function publishFacebook(pageId: string, token: string, caption: string, imageUrls: string[] = []): Promise<string> {
  // 이미지 없으면 텍스트 전용 피드 글.
  if (imageUrls.length === 0) {
    const r = await gpost(`${pageId}/feed`, { message: caption, access_token: token });
    return r.id;
  }
  // 사진 1장 이상 → 각 사진을 미게시(published:false, temporary) 업로드해 media_fbid 수집 →
  // 한 피드 글에 attached_media 로 묶어 앨범(added_photos)으로 게시. (카드뉴스 캐러셀과 동일 결과)
  const mediaFbids: string[] = [];
  for (const url of imageUrls) {
    const photo = await gpost(`${pageId}/photos`, { url, published: false, temporary: true, access_token: token });
    if (photo.id) mediaFbids.push(photo.id);
  }
  if (mediaFbids.length === 0) {
    const r = await gpost(`${pageId}/feed`, { message: caption, access_token: token });
    return r.id;
  }
  const r = await gpost(`${pageId}/feed`, {
    message: caption,
    attached_media: mediaFbids.map((id) => ({ media_fbid: id })),
    access_token: token,
  });
  return r.id;
}

export async function publishInstagram(igId: string, token: string, caption: string, imageUrls: string[]): Promise<string> {
  if (imageUrls.length === 1) {
    const c = await gpost(`${igId}/media`, { image_url: imageUrls[0], caption, access_token: token });
    await waitMediaReady(c.id, token);
    const r = await gpost(`${igId}/media_publish`, { creation_id: c.id, access_token: token });
    return r.id;
  }
  const children: string[] = [];
  for (const url of imageUrls) {
    const child = await gpost(`${igId}/media`, { image_url: url, is_carousel_item: true, access_token: token });
    await waitMediaReady(child.id, token);
    children.push(child.id);
  }
  const carousel = await gpost(`${igId}/media`, {
    media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token,
  });
  await waitMediaReady(carousel.id, token);
  const r = await gpost(`${igId}/media_publish`, { creation_id: carousel.id, access_token: token });
  return r.id;
}

export async function publishThreads(threadsId: string, token: string, caption: string, imageUrls: string[]): Promise<string> {
  let creationId: string;
  if (imageUrls.length <= 1) {
    const c = await gpost(`${threadsId}/threads`, {
      media_type: imageUrls[0] ? 'IMAGE' : 'TEXT', text: caption,
      ...(imageUrls[0] ? { image_url: imageUrls[0] } : {}), access_token: token,
    });
    creationId = c.id;
  } else {
    const children: string[] = [];
    for (const url of imageUrls) {
      const child = await gpost(`${threadsId}/threads`, { media_type: 'IMAGE', image_url: url, is_carousel_item: true, access_token: token });
      children.push(child.id);
    }
    const carousel = await gpost(`${threadsId}/threads`, { media_type: 'CAROUSEL', children: children.join(','), text: caption, access_token: token });
    creationId = carousel.id;
  }
  const r = await gpost(`${threadsId}/threads_publish`, { creation_id: creationId, access_token: token });
  return r.id;
}

// ── 영상(릴스) 발행 ──────────────────────────────────────────────────────────
// 릴스 = 단일 mp4(호스팅 URL). 캡션은 카드뉴스 공용.

// IG 릴스: media_type=REELS + video_url(+선택 cover_url) → 처리 대기 → media_publish.
export async function publishInstagramReel(igId: string, token: string, caption: string, videoUrl: string, coverUrl?: string | null): Promise<string> {
  const c = await gpost(`${igId}/media`, {
    media_type: 'REELS', video_url: videoUrl, caption,
    ...(coverUrl ? { cover_url: coverUrl } : {}),
    access_token: token,
  });
  await waitMediaReady(c.id, token, 40); // 영상 처리 = 이미지보다 김
  const r = await gpost(`${igId}/media_publish`, { creation_id: c.id, access_token: token });
  return r.id;
}

// FB: 호스팅 영상을 file_url 로 게시(description=캡션). (전용 Reels API 는 리줌어블 업로드라 호스팅 URL 단순 게시로 대체)
export async function publishFacebookReel(pageId: string, token: string, caption: string, videoUrl: string): Promise<string> {
  const r = await gpost(`${pageId}/videos`, { file_url: videoUrl, description: caption, access_token: token });
  return r.id;
}

// Threads: media_type=VIDEO + video_url → 처리 대기 → threads_publish.
export async function publishThreadsVideo(threadsId: string, token: string, caption: string, videoUrl: string): Promise<string> {
  const c = await gpost(`${threadsId}/threads`, { media_type: 'VIDEO', video_url: videoUrl, text: caption, access_token: token });
  await waitMediaReady(c.id, token, 40);
  const r = await gpost(`${threadsId}/threads_publish`, { creation_id: c.id, access_token: token });
  return r.id;
}

// 발행된 게시물 삭제. FB 페이지 게시물만 지원(IG 미디어는 Graph 삭제 미지원 → 호출자가 게이트).
export async function deletePost(postId: string, token: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${postId}?access_token=${token}`, { method: 'DELETE' });
  const json = (await res.json()) as { success?: boolean; error?: Record<string, unknown> };
  if (json.error) {
    const e = json.error;
    throw new Error(String(e['error_user_msg'] || e['message'] || '게시물 삭제 실패'));
  }
}

// 발행 후 퍼머링크(게시물 공개 URL). IG/Threads는 Graph 의 permalink, FB는 permalink_url 필드.
export async function fetchPermalink(platform: 'facebook' | 'instagram' | 'threads', postId: string, token: string): Promise<string | null> {
  if (!postId) return null;
  if (platform === 'facebook') {
    // FB 게시물의 canonical 공개 URL = permalink_url. 조회 실패 시 {pageId}/posts/{storyId} 로 구성
    // (feed 게시물 id 는 "PAGEID_STORYID"). 둘 다 안 되면 마지막 폴백.
    try {
      const res = await fetch(`${GRAPH}/${postId}?fields=permalink_url&access_token=${token}`);
      const j = (await res.json()) as { permalink_url?: string };
      if (j.permalink_url) return j.permalink_url;
    } catch { /* fall through to constructed URL */ }
    const [pageId, storyId] = postId.split('_');
    if (pageId && storyId) return `https://www.facebook.com/${pageId}/posts/${storyId}`;
    return `https://www.facebook.com/${postId}`;
  }
  try {
    const res = await fetch(`${GRAPH}/${postId}?fields=permalink&access_token=${token}`);
    const j = (await res.json()) as { permalink?: string };
    return j.permalink || null;
  } catch {
    return null;
  }
}
