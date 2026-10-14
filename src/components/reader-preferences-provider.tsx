import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { readerPreferences } from '@/services/reader-preferences';
import { readerDefaults, type ReaderPreferences } from '@/services/reader-preferences-repository';
interface Value {
  preferences: ReaderPreferences; ready: boolean; busy: boolean; error: string;
  update(patch: Partial<ReaderPreferences>): Promise<boolean>; retry(): void;
}
const Context = createContext<Value | null>(null);
export function ReaderPreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState<ReaderPreferences>({ ...readerDefaults });
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0); const active = useRef(true); const locked = useRef(false);
  useEffect(() => {
    active.current = true; let current = true;
    void readerPreferences.read().then(value => { if (current) { setPreferences(value); setReady(true); setError(''); } })
      .catch(() => { if (current) setError('Não foi possível recuperar suas preferências. A leitura continua com o padrão. Tente novamente.'); });
    return () => { current = false; active.current = false; };
  }, [attempt]);
  async function update(patch: Partial<ReaderPreferences>) {
    if (!ready || locked.current) return false;
    locked.current = true; setBusy(true);
    try {
      const next = await readerPreferences.update(patch);
      if (active.current) { setPreferences(next); setError(''); }
      return true;
    } catch { if (active.current) setError('Não foi possível salvar suas preferências. Tente novamente.'); return false; }
    finally { locked.current = false; if (active.current) setBusy(false); }
  }
  return <Context.Provider value={{ preferences, ready, busy, error, update, retry: () => { if (locked.current) return; setReady(false); setError(''); setAttempt(value => value + 1); } }}>{children}</Context.Provider>;
}
export function useReaderPreferences() { const value = useContext(Context); if (!value) throw Error('ReaderPreferencesProvider ausente.'); return value; }
