export type PremiumFeature = 'studies' | 'ministerial' | 'media';
export type AccessMode = 'free' | 'premium' | 'preview';
export const PREMIUM_FEATURES: Record<PremiumFeature, { title: string; description: string }> = {
  studies: { title: 'Estudos bíblicos', description: 'Panoramas dos 66 livros, palavras nas línguas originais e busca nos estudos.' },
  ministerial: { title: 'Apoio ministerial', description: 'Criação de esboços, duplicação de mensagens e modo de apresentação.' },
  media: { title: 'Mentorias e Pregações', description: 'Mentorias organizadas em aulas e pregações para assistir ou ouvir, exclusivas para assinantes.' },
};
export const FREE_BENEFITS = [
  'Bíblia completa offline e busca de versículos',
  'Favoritos, anotações e histórico de leitura',
  'Planos de leitura e acompanhamento do progresso',
  'Agenda e lembretes locais',
  'Temas claro e escuro e ajustes de leitura',
  'Acesso, edição e compartilhamento dos seus esboços salvos',
  'Suas reflexões pessoais e backup dos seus dados',
] as const;

// Only a future trusted billing/server adapter may supply this snapshot.
// Never read entitlement from route params, login, AsyncStorage or backups.
export interface VerifiedSubscription {
  accountId: string;
  status: 'active' | 'expired' | 'revoked';
  expiresAt: number;
}
export interface SubscriptionAdapter {
  configured: boolean;
  read(accountId: string): Promise<VerifiedSubscription | null>;
}
export interface SubscriptionState {
  accountId: string | null;
  ready: boolean;
  mode: AccessMode;
  testAccess: boolean;
  expiresAt: number | null;
  error: string;
}
export function subscriptionActive(value: VerifiedSubscription | null, accountId: string | null, now: number) {
  return !!accountId && value?.accountId === accountId && value.status === 'active' &&
    Number.isFinite(value.expiresAt) && value.expiresAt > now;
}
export function canUsePremium(mode: AccessMode) { return mode === 'premium' || mode === 'preview'; }

const premiumRoutes: Record<string, PremiumFeature> = {
  '/book-studies': 'studies', '/book-study': 'studies', '/word-studies': 'studies',
  '/word-study': 'studies', '/study-search': 'studies',
  '/sermon-builder': 'ministerial', '/sermon-presenter': 'ministerial',
  '/premium-library': 'media', '/mentorships': 'media', '/preachings': 'media',
  '/premium-content': 'media', '/content-watch': 'media', '/content-studio': 'media',
};
export function routePremiumFeature(path: string, params: Record<string, unknown> = {}): PremiumFeature | null {
  if (path === '/sermon-outline') return typeof params.id === 'string' && params.id.trim() ? null : 'ministerial';
  return premiumRoutes[path] ?? null;
}

export function createSubscriptionController(adapter: SubscriptionAdapter, development: boolean, now = Date.now, testAccess = false) {
  let accountId: string | null = null;
  let entitlement: VerifiedSubscription | null = null;
  let preview = false; let ready = true; let error = ''; let revision = 0;
  const listeners = new Set<(state: SubscriptionState) => void>();
  function current(): SubscriptionState {
    const active = subscriptionActive(entitlement, accountId, now());
    return { accountId, ready, testAccess, mode: testAccess || (preview && development) ? 'preview' : active ? 'premium' : 'free',
      expiresAt: active ? entitlement!.expiresAt : null, error };
  }
  function emit() { const state = current(); listeners.forEach(listener => listener(state)); }
  async function refresh() {
    const request = ++revision; const owner = accountId;
    entitlement = null; error = ''; ready = testAccess || !owner || !adapter.configured; emit();
    if (ready || !owner) return;
    try {
      const value = await adapter.read(owner);
      if (revision === request && accountId === owner) entitlement = value;
    } catch {
      if (revision === request) error = 'Não foi possível verificar sua assinatura. Tente novamente. Os recursos gratuitos continuam disponíveis.';
    } finally { if (revision === request) { ready = true; emit(); } }
  }
  return {
    current, refresh,
    async setAccount(id: string | null) {
      if (accountId === id) return;
      accountId = id; preview = false; await refresh();
    },
    setPreview(enabled: boolean) {
      if (!development || testAccess) return false;
      preview = enabled; emit(); return true;
    },
    tick: emit,
    subscribe(listener: (state: SubscriptionState) => void) {
      listeners.add(listener); listener(current()); return () => { listeners.delete(listener); };
    },
  };
}
