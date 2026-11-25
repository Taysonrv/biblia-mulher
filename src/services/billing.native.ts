import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { getFirebaseSession } from './firebase-session';
import { billingPeriod, createBillingQueue, premiumFromBilling } from './billing-model';
import type { BillingOffer } from './billing';

const key = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() ?? '';
const configured = Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  process.env.EXPO_PUBLIC_BILLING_ENABLED === 'true' && /^goog_[a-zA-Z0-9]+$/.test(key);
const run = createBillingQueue(() => getFirebaseSession()?.currentUser?.uid ?? null);
let sdk: typeof import('react-native-purchases').default | undefined;
async function identified(accountId: string, assertAccount: () => void) {
  if (!configured) throw Error('As assinaturas ainda estão em preparação. Nenhuma compra foi iniciada.');
  assertAccount();
  try { sdk ??= (await import('react-native-purchases')).default; }
  catch { throw Error('Atualize o aplicativo para uma versão com suporte às compras. Seus dados serão preservados.'); }
  assertAccount();
  if (!await sdk.isConfigured()) sdk.configure({ apiKey: key, appUserID: accountId, entitlementVerificationMode: sdk.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL });
  assertAccount();
  if (await sdk.getAppUserID() !== accountId) await sdk.logIn(accountId);
  assertAccount();
  if (await sdk.getAppUserID() !== accountId) throw Error('Não foi possível vincular a assinatura à sua conta.');
  return sdk;
}
function offer(item: PurchasesPackage): BillingOffer | null {
  const period = billingPeriod(item.product.subscriptionPeriod);
  if (!period || !['premium_monthly','premium_yearly'].includes(item.identifier) || !item.product.priceString) return null;
  // Initial release accepts only standard monthly/yearly plans without trial/introductory pricing.
  const phases = item.product.defaultOption?.pricingPhases;
  if (item.product.introPrice || !phases || phases.length !== 1) return null;
  return { id: item.identifier, title: period === 'por mês' ? 'Premium mensal' : 'Premium anual', price: item.product.priceString, period };
}
async function packages(client: NonNullable<typeof sdk>) {
  return (await client.getOfferings()).all.premium?.availablePackages ?? [];
}
function message(reason: unknown): Error {
  const error = reason as { code?: string; userCancelled?: boolean };
  if (error?.userCancelled || error?.code === sdk?.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return Error('Compra cancelada. Nenhum acesso foi alterado pelo app.');
  if (error?.code === sdk?.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return Error('Pagamento pendente. O Premium será liberado após a confirmação da loja. Confira a compra na Google Play antes de tentar novamente.');
  return Error('Não foi possível confirmar a operação. Confira sua compra na Google Play e tente restaurar o acesso.');
}
export const billing = {
  configured,
  async read(accountId: string) {
    if (!configured) return null;
    return run(accountId, async assertAccount => {
      const client = await identified(accountId, assertAccount);
      await client.invalidateCustomerInfoCache();
      return premiumFromBilling(await client.getCustomerInfo(), accountId, __DEV__);
    });
  },
  offers: (accountId: string) => run(accountId, async assertAccount => {
    const client = await identified(accountId, assertAccount);
    return (await packages(client)).map(offer).filter((item): item is BillingOffer => item !== null);
  }),
  purchase: (accountId: string, id: string) => run(accountId, async assertAccount => {
    const client = await identified(accountId, assertAccount);
    const available = await packages(client); assertAccount();
    const item = available.find(row => row.identifier === id && offer(row));
    if (!item) throw Error('Esse plano não está disponível. Consulte os preços novamente.');
    // Do not silently create a second subscription or implement an untested plan replacement.
    const current = premiumFromBilling(await client.getCustomerInfo(), accountId, __DEV__); assertAccount();
    if (current) throw Error('Você já tem Premium ativo. Gerencie sua assinatura pela Google Play.');
    try {
      const result = await client.purchasePackage(item); assertAccount();
      return premiumFromBilling(result.customerInfo, accountId, __DEV__) ? 'Compra confirmada. Vamos atualizar seu acesso Premium.' : 'A loja ainda não confirmou um acesso Premium válido. Confira a compra antes de tentar novamente.';
    } catch (reason) { assertAccount(); throw message(reason); }
  }),
  restore: (accountId: string) => run(accountId, async assertAccount => {
    const client = await identified(accountId, assertAccount);
    try {
      const result = await client.restorePurchases(); assertAccount();
      return premiumFromBilling(result, accountId, __DEV__) ? 'Assinatura encontrada. Vamos atualizar seu acesso.' : 'Nenhuma assinatura Premium ativa foi encontrada para esta conta. Confira a conta usada na compra.';
    } catch (reason) { assertAccount(); throw message(reason); }
  }),
};
