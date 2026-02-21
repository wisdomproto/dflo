import { Router, Request, Response } from 'express';
import { analyzeMeal } from '../services/mealAnalyzer.js';

export const mealRouter = Router();

mealRouter.post('/meal', async (req: Request, res: Response) => {
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

    const result = await analyzeMeal(image, mimeType);

    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});
