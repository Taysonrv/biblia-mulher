import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { readingJourney } from '@/services/reading-journey';
import type { ChapterVisit } from '@/services/reading-journey-repository';
import { validChapter } from '@/data/bible-catalog';

// Only the focused reader records visits; lists and Home just refresh the history.
export function useReadingJourney(book?: string, chapter?: number) {
  const [entries, setEntries] = useState<ChapterVisit[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const recording = book !== undefined && chapter !== undefined && validChapter(book, chapter);
  useFocusEffect(useCallback(() => {
    let active = true;
    setReady(false);
    if (attempt > 0) setError('');
    const task = recording ? readingJourney.record(book!, chapter!) : readingJourney.read();
    task.then(data => { if (active) { setEntries(data); setError(''); } })
      .catch(() => { if (active) setError(recording ? 'Não foi possível salvar o histórico. Sua leitura continua disponível. Tente novamente.' : 'Não foi possível recuperar o histórico. Tente novamente.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [book, chapter, recording, attempt]));
  return { entries, lastRead: entries[0], ready, error, retry: () => setAttempt(value => value + 1) };
}
