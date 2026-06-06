// Graph v21.0 발행. 반환: postId 또는 throw(Graph 에러 메시지).
const GRAPH = 'https://graph.facebook.com/v21.0';

async function gpost(path: string, body: Record<string, unknown>): Promise<{ id: string }> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message || 'Graph 오류');
  return { id: json.id || '' };
}

export async function publishFacebook(pageId: string, token: string, caption: string): Promise<string> {
  const r = await gpost(`${pageId}/feed`, { message: caption, access_token: token });
  return r.id;
}

export async function publishInstagram(igId: string, token: string, caption: string, imageUrls: string[]): Promise<string> {
  if (imageUrls.length === 1) {
    const c = await gpost(`${igId}/media`, { image_url: imageUrls[0], caption, access_token: token });
    const r = await gpost(`${igId}/media_publish`, { creation_id: c.id, access_token: token });
    return r.id;
  }
  const children: string[] = [];
  for (const url of imageUrls) {
    const child = await gpost(`${igId}/media`, { image_url: url, is_carousel_item: true, access_token: token });
    children.push(child.id);
  }
  const carousel = await gpost(`${igId}/media`, {
    media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token,
  });
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
