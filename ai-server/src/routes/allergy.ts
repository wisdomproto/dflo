import { Router, Request, Response } from 'express';
import { analyzeAllergyTest } from '../services/allergyAnalyzer.js';

export const allergyRouter = Router();

allergyRouter.post('/allergy', async (req: Request, res: Response) => {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      res.status(400).json({ success: false, error: 'image is required' });
      return;
    }

    if (!mimeType || !mimeType.startsWith('image/')) {
      res.status(400).json({ success: false, error: 'mimeType must be image/*' });
      return;
    }

    const result = await analyzeAllergyTest(image, mimeType);

    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
