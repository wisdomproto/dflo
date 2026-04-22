import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { putObject, getObject, publicUrl } from '../services/r2.js';

export const r2Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// Shared admin PIN check (reuses existing website admin pin)
const ADMIN_PIN = process.env.WEBSITE_ADMIN_PIN || '8054';

function checkPin(req: Request, res: Response, next: NextFunction) {
  const pin = req.header('x-admin-pin') || (req.body && req.body._pin);
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ success: false, error: 'invalid pin' });
  }
  next();
}

// Allowlist of section JSON keys that can be read/written via these routes.
// Anything else is rejected to keep the surface narrow.
const ALLOWED_SECTION_KEYS = new Set(['website.json', 'app-home.json']);

function resolveSectionKey(req: Request): string | null {
  const raw = (req.query.key as string | undefined) || 'website.json';
  return ALLOWED_SECTION_KEYS.has(raw) ? raw : null;
}

// GET /api/r2/website[?key=app-home.json] — read sections JSON (public)
r2Router.get('/website', async (req, res) => {
  const key = resolveSectionKey(req);
  if (!key) return res.status(400).json({ success: false, error: 'invalid key' });
  const buf = await getObject(key);
  if (!buf) return res.status(404).json({ success: false, error: 'not found' });
  res.setHeader('Content-Type', 'application/json');
  res.send(buf);
});

// PUT /api/r2/website[?key=app-home.json] — replace sections JSON (admin)
r2Router.put('/website', checkPin, async (req, res) => {
  const key = resolveSectionKey(req);
  if (!key) return res.status(400).json({ success: false, error: 'invalid key' });
  try {
    const body = JSON.stringify(req.body.data ?? req.body);
    const url = await putObject(key, body, 'application/json');
    res.json({ success: true, url, key });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// POST /api/r2/upload — upload image (admin)
// FormData: file=<image>, folder=<banners|cases|...> (optional)
r2Router.post('/upload', checkPin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'file required' });
    const folder = (req.body.folder || 'uploads').replace(/[^a-zA-Z0-9/_-]/g, '');
    const ext = (req.file.originalname.split('.').pop() || 'bin').toLowerCase();
    const key = `images/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const url = await putObject(key, req.file.buffer, req.file.mimetype);
    res.json({ success: true, url, key });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

// GET /api/r2/public-url — tell the client where to read from
r2Router.get('/public-url', (_req, res) => {
  res.json({ url: publicUrl });
});
