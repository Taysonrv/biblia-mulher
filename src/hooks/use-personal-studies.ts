import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { personalStudies } from '@/services/personal-studies';
import { findPersonalStudies, type PersonalStudy, type StudyKind } from '@/services/personal-studies-repository';

export function usePersonalStudies() {
  const [entries, setEntries] = useState<PersonalStudy[]>([]); const [ready, setReady] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const focused = useRef(false); const request = useRef(0); const locked = useRef(false);
  const refresh = useCallback(() => {
    if (!focused.current) return;
    const id = ++request.current; setReady(false); setError('');
    personalStudies.read().then(rows => { if (focused.current && request.current === id) { setEntries(rows); setReady(true); } })
      .catch(() => { if (focused.current && request.current === id) setError('Não foi possível carregar seus estudos. Seus dados foram preservados. Tente novamente.'); });
  }, []);
  useFocusEffect(useCallback(() => { focused.current = true; refresh(); return () => { focused.current = false; request.current++; }; }, [refresh]));
  async function setSaved(kind: StudyKind, studyId: string, saved: boolean) {
    if (!ready || locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const entry = await personalStudies.setSaved(kind, studyId, saved);
      if (focused.current) setEntries(current => findPersonalStudies([...current.filter(row => row.kind !== kind || row.studyId !== studyId), ...(entry ? [entry] : [])], ''));
    } catch (reason) { if (focused.current) setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o estudo. Tente novamente.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return { entries, ready, error, busy, retry: refresh, setSaved };
}
