import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { searchBible, SearchCancelled, SearchInputError, type BibleSearchRequest, type BibleSearchResult } from '@/services/bible-search';

export function useBibleSearch() {
  const [result, setResult] = useState<BibleSearchResult | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const generation = useRef(0); const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true; setBusy(false);
    return () => { focused.current = false; generation.current++; };
  }, []));
  function clear() { generation.current++; setBusy(false); setError(''); setResult(null); }
  async function start(request: BibleSearchRequest) {
    const id = ++generation.current; setBusy(true); setError(''); setResult(null);
    try {
      const value = await searchBible(request, { cancelled: () => generation.current !== id || !focused.current });
      if (generation.current === id && focused.current) setResult(value);
    } catch (reason) {
      if (generation.current === id && focused.current && !(reason instanceof SearchCancelled)) setError(reason instanceof SearchInputError ? reason.message : 'Não foi possível concluir a busca. Tente novamente.');
    } finally { if (generation.current === id && focused.current) setBusy(false); }
  }
  return { result, busy, error, clear, start };
}
