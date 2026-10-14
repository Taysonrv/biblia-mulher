import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { readingRepository } from '@/services/reading';
import type { ReadingEntry } from '@/services/reading-repository';
export function useReading() {
  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const focused = useRef(false);
  const request = useRef(0);
  const refresh = useCallback(() => {
    if (!focused.current) return;
    const id = ++request.current;
    setReady(false); setError('');
    readingRepository.read().then(data => { if (focused.current && id === request.current) { setEntries(data); setError(''); setReady(true); } }).catch(() => { if (focused.current && id === request.current) setError('Não foi possível carregar seus dados. Tente carregar novamente.'); });
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true; refresh();
    return () => { focused.current = false; request.current++; };
  }, [refresh]));
  async function mutate(action: () => Promise<ReadingEntry[]>) {
    if (locked.current || !ready) return false;
    locked.current = true; setBusy(true);
    try { setEntries(await action()); setError(''); return true; }
    catch { setError('Não foi possível salvar. Seus dados anteriores foram preservados. Tente novamente.'); return false; }
    finally { locked.current = false; setBusy(false); }
  }
  return { entries, error, ready, busy, retry: () => { if (!locked.current) refresh(); }, toggle: (verse: number, book = 'Salmos', chapter = 23) => mutate(() => readingRepository.toggleFavorite(verse, book, chapter)), setFavorite: (verse: number, favorite: boolean, book = 'Salmos', chapter = 23) => mutate(() => readingRepository.setFavorite(verse, favorite, book, chapter)), save: (verse: number, note: string, book = 'Salmos', chapter = 23) => mutate(() => readingRepository.saveNote(verse, note, book, chapter)) };
}
