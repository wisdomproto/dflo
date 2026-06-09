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

// 컨테이너 처리 완료까지 폴링. 이미지 fetch+처리에 시간이 걸려서, 즉시 media_publish 하면
// "Media ID is not available" 가 남 → status_code=FINISHED 될 때까지 대기.
async function waitMediaReady(containerId: string, token: string): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${GRAPH}/${containerId}?fields=status_code,status&access_token=${token}`);
    const j = (await res.json()) as { status_code?: string; status?: string };
    if (j.status_code === 'FINISHED') return;
    if (j.status_code === 'ERROR') throw new Error(`미디어 처리 실패: ${j.status || 'ERROR'}`);
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
