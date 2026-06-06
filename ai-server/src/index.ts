import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from './middleware/auth.js';
import { mealRouter } from './routes/meal.js';
import { bodyRouter } from './routes/body.js';
import { allergyRouter } from './routes/allergy.js';
import { r2Router } from './routes/r2.js';
import { patientAnalysisRouter } from './routes/patientAnalysis.js';
import { analyticsRouter } from './routes/analytics.js';
import { embeddingsRouter } from './routes/embeddings.js';
import { similarCasesRouter } from './routes/similarCases.js';
import { coachingRouter } from './routes/coaching.js';
import { marketingRouter } from './routes/marketing.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { metaAuthRouter } from './routes/metaAuth.js';
import { startScheduler } from './services/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

// 프로덕션 CORS — 도메인 패턴 기반 허용 + CORS_ORIGIN env 로 명시적 추가 가능.
// 도메인이 늘 때마다 env 만질 필요 없도록 정규식 패턴 사용.
const ALLOWED_HOST_PATTERNS = [
  /^dr187growup\.com$/,
  /\.dr187growup\.com$/,
  /\.up\.railway\.app$/,      // Railway 모든 서비스
  /^localhost(:\d+)?$/,        // 로컬 dev (포트 무관)
  /^127\.0\.0\.1(:\d+)?$/,
];

const explicitOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: isDev
    ? true  // dev: 모든 origin 허용 (모바일 테스트용)
    : (origin, cb) => {
        // origin 없는 경우 (server-to-server, curl 등) 통과
        if (!origin) return cb(null, true);
        try {
          const { hostname, host } = new URL(origin);
          if (ALLOWED_HOST_PATTERNS.some((p) => p.test(hostname) || p.test(host))) {
            return cb(null, true);
          }
        } catch {
          // 잘못된 URL → 거부
        }
        if (explicitOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin '${origin}' not allowed`));
      },
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
app.use('/api/analyze', ...middlewares, allergyRouter);
app.use('/api/r2', r2Router);
app.use('/api/patient-analysis', ...middlewares, patientAnalysisRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/embeddings', ...middlewares, embeddingsRouter);
app.use('/api/similar-cases', ...middlewares, similarCasesRouter);
app.use('/api/coaching', ...middlewares, coachingRouter);
app.use('/api/marketing', ...middlewares, marketingRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/auth/meta', metaAuthRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`AI Server running on http://0.0.0.0:${PORT}`);
});
startScheduler();
