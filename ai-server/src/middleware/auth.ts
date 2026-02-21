import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        [key: string]: unknown;
      };
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required',
    );
  }
  console.warn('⚠️  Supabase 환경변수 미설정 — authMiddleware 사용 불가');
}

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Express middleware that verifies a Supabase JWT from the Authorization header.
 * Attaches the authenticated user to `req.user`.
 * Returns 401 if the token is missing or invalid.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '인증 토큰이 필요합니다.' });
    return;
  }

  if (!supabase) {
    res.status(500).json({ error: 'Auth가 설정되지 않았습니다.' });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: '유효하지 않은 인증 토큰입니다.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
    };

    next();
  } catch {
    res.status(401).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
}
