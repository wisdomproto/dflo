// ai-server/src/middleware/marketingAuth.ts
// 마케팅 센터(/marketing, PIN 8054 보호)는 Supabase 로그인을 쓰지 않으므로,
// JWT(authMiddleware) 대신 가벼운 공유 시크릿 헤더로 /api/marketing/* 를 보호한다.
//   - prod: MARKETING_KEY 설정 → 헤더 'x-marketing-key' 일치해야 통과
//   - dev:  MARKETING_KEY 미설정 → 통과 (기존 dev 동작 유지)
// 발행(publish/run)·Meta 연결 조회를 배포본에서도 쓸 수 있게 하는 게 목적.
import { Request, Response, NextFunction } from 'express';

export function marketingAuth(req: Request, res: Response, next: NextFunction): void {
  const required = process.env.MARKETING_KEY;
  if (!required) {
    next(); // 키 미설정(dev) → 통과
    return;
  }
  const provided = req.headers['x-marketing-key'];
  if (typeof provided === 'string' && provided === required) {
    next();
    return;
  }
  res.status(401).json({ success: false, error: '마케팅 인증이 필요합니다.' });
}
