import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from './subscription-provider';
import { canUsePremium } from '@/services/subscription-access';
import { createContentJourneyRepository, journeyStorageKey, type ContentJourney, type JourneyStorage } from '@/services/content-journey-model';
import type { PremiumContent } from '@/services/premium-content-model';

interface JourneyContextValue {
  entries: ContentJourney[]; ready: boolean; error: string; busy: boolean;
  retry(): void;
  change(content: PremiumContent, action: 'favorite' | 'visit' | 'complete', lessonId?: string): Promise<void>;
  recordPosition(content: PremiumContent, lessonId: string, seconds: number, duration: number): Promise<void>;
}
const JourneyContext = createContext<JourneyContextValue | null>(null);
function temporaryJourneyStorage(): JourneyStorage {
  const values = new Map<string, string>();
  return { getItem: async key => values.get(key) ?? null, setItem: async (key, raw) => { values.set(key, raw); } };
}
function JourneySession({ children, owner, preview }: PropsWithChildren<{ owner: string | null; preview: boolean }>) {
  const { current } = useSubscription();
  const repository = useMemo(() => {
    const storage: JourneyStorage = preview ? temporaryJourneyStorage() : AsyncStorage;
    return createContentJourneyRepository(storage, journeyStorageKey(owner), () => {
      const access = current(); return canUsePremium(access.mode) && access.accountId === owner && (access.mode === 'preview') === preview;
    });
  }, [owner, preview, current]);
  const [entries, setEntries] = useState<ContentJourney[]>([]); const [ready, setReady] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const mounted = useRef(false); const operation = useRef(false); const request = useRef(0);
  const load = useCallback(() => {
    const version = ++request.current; setReady(false); setError('');
    repository.read().then(rows => { if (mounted.current && version === request.current) { setEntries(rows); setReady(true); } }, () => { if (mounted.current && version === request.current) setError('Não foi possível abrir seus favoritos e progresso. Tente novamente.'); });
  }, [repository]);
  useEffect(() => {
    mounted.current = true; let cancelled = false; const version = request.current;
    repository.read().then(rows => { if (!cancelled && version === request.current) { setEntries(rows); setReady(true); } }, () => { if (!cancelled && version === request.current) setError('Não foi possível abrir seus favoritos e progresso. Tente novamente.'); });
    return () => { cancelled = true; mounted.current = false; };
  }, [repository]);
  const change = useCallback(async (content: PremiumContent, action: 'favorite' | 'visit' | 'complete', lessonId?: string) => {
    if (operation.current || !ready) return;
    operation.current = true; setBusy(true); setError('');
    // A write response supersedes any earlier load response.
    request.current++;
    try { const rows = await repository.update(content, action, lessonId); if (mounted.current) setEntries(rows); }
    catch { if (mounted.current) setError('Não foi possível salvar seus favoritos ou progresso. Tente novamente.'); }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  }, [repository, ready]);
  const recordPosition = useCallback(async (content: PremiumContent, lessonId: string, seconds: number, duration: number) => {
    if (!ready) return;
    request.current++;
    try { const rows = await repository.update(content, 'position', lessonId, { seconds, duration }); if (mounted.current) setEntries(rows); }
    catch { if (mounted.current) setError('Não foi possível guardar o ponto de reprodução. Seus registros anteriores foram preservados.'); }
  }, [repository, ready]);
  return <JourneyContext value={{ entries, ready, error, busy, retry: load, change, recordPosition }}>{children}</JourneyContext>;
}
export function ContentJourneyProvider({ children }: PropsWithChildren) {
  const { accountId, mode } = useSubscription(); const preview = mode === 'preview';
  // Remount before rendering another account, or entering/leaving a temporary preview.
  return <JourneySession key={JSON.stringify([accountId, preview])} owner={accountId} preview={preview}>{children}</JourneySession>;
}
export function useContentJourney() {
  const value = useContext(JourneyContext); if (!value) throw Error('ContentJourneyProvider is required.'); return value;
}
