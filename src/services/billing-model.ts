import type { VerifiedSubscription } from './subscription-access';

export interface BillingEntitlement {
  isActive: boolean; expirationDate: string | null; verification: string; isSandbox: boolean;
}
export interface BillingInfo { entitlements: { verification: string; active: Record<string, BillingEntitlement> } }
export function premiumFromBilling(info: BillingInfo, accountId: string, allowSandbox: boolean, now = Date.now()): VerifiedSubscription | null {
  const verified = (value: string) => value === 'VERIFIED' || value === 'VERIFIED_ON_DEVICE';
  if (!verified(info.entitlements.verification)) throw Error('Não foi possível validar a resposta da assinatura. Tente novamente.');
  const premium = info.entitlements.active.premium;
  if (!premium) return null;
  if (!verified(premium.verification)) throw Error('Não foi possível validar seu acesso Premium.');
  const expiresAt = premium.expirationDate ? Date.parse(premium.expirationDate) : NaN;
  if (!premium.isActive || (!allowSandbox && premium.isSandbox) || !Number.isFinite(expiresAt) || expiresAt <= now) return null;
  // Premium+ is intentionally not sold or inferred from other entitlements.
  return { accountId, tier: 'premium', status: 'active', expiresAt };
}
export function billingPeriod(period: string | null): string | null {
  return period === 'P1M' ? 'por mês' : period === 'P1Y' ? 'por ano' : null;
}
// One SDK identity at a time; check Firebase identity before AND after every operation.
export function createBillingQueue(currentAccount: () => string | null) {
  let queue: Promise<unknown> = Promise.resolve();
  return function run<T>(accountId: string, operation: (assertAccount: () => void) => Promise<T>): Promise<T> {
    const assertAccount = () => { if (!accountId || currentAccount() !== accountId) throw Error('Sua conta mudou. Entre novamente na conta da assinatura para conferir o acesso.'); };
    const task = queue.then(async () => { assertAccount(); const result = await operation(assertAccount); assertAccount(); return result; });
    queue = task.catch(() => undefined); return task;
  };
}
