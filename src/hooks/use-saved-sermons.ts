import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { savedSermons } from '@/services/saved-sermons';
import type { SavedSermon } from '@/services/sermon-repository';
export function useSavedSermons() {
  const [entries, setEntries] = useState<SavedSermon[]>([]); const [ready, setReady] = useState(false); const [error, setError] = useState('');
  const focused = useRef(false); const request = useRef(0);
  const refresh = useCallback(() => {
    if (!focused.current) return;
    const id = ++request.current; setReady(false); setError('');
    savedSermons.read().then(rows => { if (focused.current && request.current === id) { setEntries(rows); setReady(true); } })
      .catch(() => { if (focused.current && request.current === id) setError('Não foi possível carregar os esboços. Seus dados foram preservados. Tente novamente.'); });
  }, []);
  useFocusEffect(useCallback(() => { focused.current = true; refresh(); return () => { focused.current = false; request.current++; }; }, [refresh]));
  return { entries, ready, error, retry: refresh };
}
