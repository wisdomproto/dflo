// src/features/marketing/hooks/useMarketingAuth.ts
import { useCallback, useState } from 'react';

const MARKETING_PIN = '8054';
const AUTH_KEY = 'marketing-admin-auth';

export function useMarketingAuth() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === 'true',
  );

  const submitPin = useCallback((pin: string): boolean => {
    if (pin === MARKETING_PIN) {
      sessionStorage.setItem(AUTH_KEY, 'true');
      setAuthed(true);
      return true;
    }
    return false;
  }, []);

  return { authed, submitPin };
}
