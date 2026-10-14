import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { planRepository } from '@/services/reading-plans';
import { emptyPlanState, type PlanState } from '@/services/reading-plan-repository';

export function useReadingPlans() {
  const [state, setState] = useState<PlanState>(emptyPlanState);
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  const locked = useRef(false); const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true; focused.current = true; setReady(false); setBusy(locked.current);
    if (attempt > 0) setError('');
    planRepository.read().then(value => { if (active) { setState(value); setError(''); } })
      .catch(() => { if (active) setError('Não foi possível recuperar seus planos. Seus dados foram preservados. Tente novamente.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; focused.current = false; };
  }, [attempt]));
  async function change(action: () => Promise<PlanState>) {
    if (locked.current || !ready) return;
    locked.current = true; setBusy(true);
    try { const value = await action(); if (focused.current) { setState(value); setError(''); } }
    catch { if (focused.current) setError('Não foi possível salvar o progresso. Tente novamente.'); }
    finally { locked.current = false; if (focused.current) setBusy(false); }
  }
  return { state, ready, busy, error, retry: () => setAttempt(value => value + 1),
    activate: (id: string) => change(() => planRepository.activate(id)),
    pause: (id: string) => change(() => planRepository.pause(id)),
    complete: (id: string, day: number, book: string, chapter: number, value: boolean) => change(() => planRepository.setComplete(id, day, book, chapter, value)),
  };
}
