import { getFirebaseSession } from './firebase-session';
import { validateOutline } from './sermon-repository';
import type { SermonOutline } from './sermon';
import { preachingWordCount } from './sermon-preaching';

export const PREACHING_DURATIONS = [15, 25, 40] as const;
export type PreachingDuration = typeof PREACHING_DURATIONS[number];
export function preachingTiming(outline: SermonOutline, duration: PreachingDuration) {
  const words = preachingWordCount(outline);
  return { words, target: duration * 120, minimum: Math.max(1, Math.ceil(words / 140)), maximum: Math.max(1, Math.ceil(words / 100)) };
}
const endpoint = process.env.EXPO_PUBLIC_PREACHING_AI_URL?.trim() ?? '';
export const preachingAiConfigured = /^https:\/\/[^\s]+$/.test(endpoint);
export async function generatePreachingWithAi(outline: SermonOutline, duration: PreachingDuration): Promise<SermonOutline> {
  if (!preachingAiConfigured) throw Error('A geração por IA ainda precisa ser ativada no servidor. A montagem local continua disponível.');
  const user = getFirebaseSession()?.currentUser;
  if (!user) throw Error('Entre na sua conta antes de gerar a pregação por IA.');
  if (!PREACHING_DURATIONS.includes(duration)) throw Error('Escolha 15, 25 ou 40 minutos.');
  const source = validateOutline(outline);
  const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), 300000);
  try {
    const token = await user.getIdToken();
    const response = await fetch(endpoint, { method: 'POST', signal: abort.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ outline: source, duration }) });
    if (!response.ok) {
      const messages: Record<number, string> = { 401: 'Sua sessão expirou. Entre novamente.', 403: 'A geração por IA ainda não está liberada para sua conta.', 429: 'O limite temporário ou diário de geração foi atingido. Aguarde antes de tentar novamente.', 503: 'O serviço de IA ainda não está disponível.' };
      throw Error(messages[response.status] ?? 'Não foi possível gerar a mensagem. Seu esboço foi preservado.');
    }
    const result = await response.json();
    const draft = validateOutline(result.outline);
    if (draft.theme !== source.theme || draft.baseText !== source.baseText || JSON.stringify(draft.references) !== JSON.stringify(source.references) || draft.points.some((point, i) => point.title !== source.points[i].title)) throw Error('A resposta alterou as referências do esboço. Gere uma nova prévia.');
    const words = preachingWordCount(draft);
    if (words < duration * 120 * 0.8 || words > duration * 120 * 1.3) throw Error('O texto não atingiu a extensão esperada. Seu esboço foi preservado.');
    return draft;
  } catch (reason) {
    if (abort.signal.aborted) throw Error('A geração demorou além do limite. Confira antes de tentar novamente: a tentativa pode ter consumido a cota.');
    throw reason;
  } finally { clearTimeout(timer); }
}
