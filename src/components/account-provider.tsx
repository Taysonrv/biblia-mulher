import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { accountService } from '@/services/account';
import { authErrorMessage, type AccountUser } from '@/services/auth-model';
interface AccountContextValue {
  user: AccountUser | null; ready: boolean; configured: boolean; busy: string; error: string; notice: string;
  action(kind: string, operation: () => Promise<string>): Promise<boolean>;
  clearFeedback(): void; retry(): void;
}
const AccountContext = createContext<AccountContextValue | null>(null);
export function AccountProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AccountUser | null>(null); const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0); const locked = useRef(false); const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true; let active = true;
    const unsubscribe = accountService.subscribe(current => { if (active) { setUser(current); setReady(true); } }, () => {
      if (active) { setReady(true); setError('Não conseguimos recuperar seu acesso. Tente novamente.'); }
    });
    return () => { active = false; mounted.current = false; unsubscribe(); };
  }, [attempt]);
  async function action(kind: string, operation: () => Promise<string>) {
    if (locked.current || !ready) return false;
    locked.current = true; setBusy(kind); setError(''); setNotice('');
    try {
      const message = await operation();
      if (mounted.current) { setUser(accountService.current()); setNotice(message); }
      return true;
    } catch (reason) { if (mounted.current) setError(authErrorMessage(reason)); return false; }
    finally { locked.current = false; if (mounted.current) setBusy(''); }
  }
  return <AccountContext.Provider value={{ user, ready, configured: accountService.configured, busy, error, notice, action,
    clearFeedback: () => { setError(''); setNotice(''); }, retry: () => { setError(''); setReady(false); setAttempt(value => value + 1); } }}>{children}</AccountContext.Provider>;
}
export function useAccount() { const context = useContext(AccountContext); if (!context) throw Error('AccountProvider ausente.'); return context; }
