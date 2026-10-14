import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useContentLibrary } from '@/components/content-provider';
import type { PremiumContent } from '@/services/premium-content-model';
export function useContentCatalog() {
  const library = useContentLibrary(); const [items, setItems] = useState<PremiumContent[]>([]); const [ready, setReady] = useState(false); const [error, setError] = useState('');
  const request = useRef(0); const focused = useRef(false);
  const load = useCallback(() => {
    const id = ++request.current; setError(''); setReady(false); setItems([]);
    library.list().then(rows => { if (focused.current && request.current === id) { setItems(rows); setReady(true); } }, () => { if (focused.current && request.current === id) setError('Não foi possível carregar os conteúdos. Confira sua conexão e tente novamente.'); });
  }, [library]);
  useFocusEffect(useCallback(() => { focused.current = true; load(); return () => { focused.current = false; request.current++; }; }, [load]));
  return { items, ready, error, retry: load };
}
