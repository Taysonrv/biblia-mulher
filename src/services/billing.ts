import type { VerifiedSubscription } from './subscription-access';
export interface BillingOffer { id: string; title: string; price: string; period: string }
export const billing = {
  configured: false,
  async read(_accountId: string): Promise<VerifiedSubscription | null> { return null; },
  async offers(_accountId: string): Promise<BillingOffer[]> { return []; },
  async purchase(_accountId: string, _id: string): Promise<string> { throw Error('As compras ainda não estão disponíveis nesta plataforma.'); },
  async restore(_accountId: string): Promise<string> { throw Error('A restauração ainda não está disponível nesta plataforma.'); },
};
