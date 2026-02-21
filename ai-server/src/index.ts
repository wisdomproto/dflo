import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from './middleware/auth.js';
import { mealRouter } from './routes/meal.js';
import { bodyRouter } from './routes/body.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: isDev
    ? true  // dev: 모든 origin 허용 (모바일 테스트용)
    : process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173'],
}));
app.use(express.json({ limit: '10mb' }));

const analyzeLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

const middlewares = isDev
  ? [analyzeLimit]
  : [analyzeLimit, authMiddleware];

if (isDev) {
  console.log('⚠️  DEV 모드: 인증 미들웨어 비활성화');
}

app.use('/api/analyze', ...middlewares, mealRouter);
app.use('/api/analyze', ...middlewares, bodyRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`AI Server running on http://0.0.0.0:${PORT}`);
});
