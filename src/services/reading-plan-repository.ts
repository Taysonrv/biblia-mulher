import { getReadingPlan, planChapterKey, planContains, readingPlans } from '../data/reading-plans';

export interface PlanProgress { planId: string; startedAt: number; completed: string[] }
export interface PlanState { version: 1; activePlanId: string | null; plans: PlanProgress[] }
interface Storage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
export const PLAN_KEY = '@biblia-smart/reading-plans/v1';
export const emptyPlanState = (): PlanState => ({ version: 1, activePlanId: null, plans: [] });

export function createPlanRepository(storage: Storage, now: () => number = Date.now) {
  let queue: Promise<unknown> = Promise.resolve();
  async function readStored(): Promise<PlanState> {
    const raw = await storage.getItem(PLAN_KEY);
    if (raw === null) return emptyPlanState();
    const state = JSON.parse(raw);
    if (state?.version !== 1 || !Array.isArray(state.plans) || state.plans.length > readingPlans.length || (state.activePlanId !== null && typeof state.activePlanId !== 'string')) throw Error('Planos inválidos.');
    const ids = new Set<string>();
    for (const entry of state.plans) {
      const plan = getReadingPlan(typeof entry?.planId === 'string' ? entry.planId : '');
      if (!plan || ids.has(entry.planId) || !Number.isSafeInteger(entry.startedAt) || entry.startedAt <= 0 || entry.startedAt > 8.64e15 || !Array.isArray(entry.completed)) throw Error('Progresso inválido.');
      ids.add(entry.planId);
      const valid = new Set(plan.days.flatMap(day => day.readings.map(item => planChapterKey(day.day, item.book, item.chapter))));
      if (entry.completed.length > valid.size || new Set(entry.completed).size !== entry.completed.length || entry.completed.some((key: unknown) => typeof key !== 'string' || !valid.has(key))) throw Error('Leituras inválidas.');
    }
    if (state.activePlanId !== null && !ids.has(state.activePlanId)) throw Error('Plano ativo inválido.');
    return state;
  }
  function mutate(update: (state: PlanState) => void) {
    const task = queue.then(async () => {
      const state = await readStored(); update(state);
      await storage.setItem(PLAN_KEY, JSON.stringify(state)); return state;
    });
    queue = task.catch(() => undefined); return task;
  }
  return {
    read: async () => { await queue; return readStored(); },
    activate: (id: string) => mutate(state => {
      if (!getReadingPlan(id)) throw Error('Plano não encontrado.');
      if (!state.plans.some(plan => plan.planId === id)) {
        const startedAt = now();
        if (!Number.isSafeInteger(startedAt) || startedAt <= 0 || startedAt > 8.64e15) throw Error('Data inválida.');
        state.plans.push({ planId: id, startedAt, completed: [] });
      }
      state.activePlanId = id;
    }),
    pause: (id: string) => mutate(state => { if (!getReadingPlan(id)) throw Error('Plano não encontrado.'); if (state.activePlanId === id) state.activePlanId = null; }),
    setComplete: (id: string, day: number, book: string, chapter: number, complete: boolean) => mutate(state => {
      if (!planContains(id, day, book, chapter) || typeof complete !== 'boolean') throw Error('Leitura não pertence à etapa.');
      const progress = state.plans.find(plan => plan.planId === id);
      if (!progress) throw Error('Comece o plano antes de marcar uma leitura.');
      const key = planChapterKey(day, book, chapter);
      progress.completed = progress.completed.filter(item => item !== key);
      if (complete) progress.completed.push(key);
    }),
  };
}
