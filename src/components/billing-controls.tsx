import { useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAccount } from './account-provider';
import { useSubscription } from './subscription-provider';
import { useUi } from './modern-ui';
import { ActionButton } from './ui-controls';
import { billing, type BillingOffer } from '@/services/billing';

export function BillingControls() {
  const account = useAccount(); const subscription = useSubscription(); const ui = useUi();
  const [offers, setOffers] = useState<{ uid: string; values: BillingOffer[] } | null>(null);
  const [feedback, setFeedback] = useState<{ uid: string; text: string } | null>(null);
  const [busy, setBusy] = useState(''); const locked = useRef(false);
  const uid = account.user?.uid;
  if (!billing.configured || subscription.testAccess || subscription.mode === 'preview') return null;
  async function action(kind: string, operation: (owner: string) => Promise<string>) {
    if (!uid || locked.current) return;
    locked.current = true; setBusy(kind); setFeedback(null);
    try { const text = await operation(uid); setFeedback({ uid, text }); }
    catch (reason) { setFeedback({ uid, text: reason instanceof Error ? reason.message : 'Não foi possível concluir. Tente novamente.' }); }
    finally { locked.current = false; setBusy(''); subscription.refresh(); }
  }
  return <View style={ui.card}>
    <Text style={ui.heading}>Assinatura pela Google Play</Text>
    <Text style={ui.body}>O Premium inclui estudos e desenvolvimento local de esboços. A geração por IA não faz parte desta oferta. A assinatura é renovada automaticamente até o cancelamento; gerencie-a na Google Play.</Text>
    <Text style={ui.body}>Para verificar compras, seu identificador de conta e os dados da assinatura são processados pelo RevenueCat e pela loja. Use a mesma conta do Bíblia Smart ao comprar e restaurar. Confira os termos e a política antes de continuar.</Text>
    {!uid ? <ActionButton label="Entrar para consultar os planos" onPress={() => router.navigate('/account')} /> : <>
      <ActionButton label="Consultar planos e preços" disabled={!!busy || !subscription.ready} busy={busy === 'offers'} onPress={() => void action('offers', async owner => {
        const values = await billing.offers(owner); setOffers({ uid: owner, values });
        return values.length ? 'Preços informados pela Google Play. Confira o plano antes de confirmar na loja.' : 'Os planos ainda não estão disponíveis para esta conta na loja.';
      })} />
      {offers?.uid === uid && offers.values.map(item => <View key={item.id} style={{ gap: 8 }}>
        <Text style={ui.cardTitle}>{item.title} — {item.price} {item.period}</Text>
        <ActionButton label={`Assinar ${item.title} por ${item.price} ${item.period}`} disabled={!!busy || !subscription.ready || subscription.hasPremium} busy={busy === item.id} onPress={() => void action(item.id, owner => billing.purchase(owner, item.id))} />
      </View>)}
      <ActionButton secondary label="Restaurar compras" disabled={!!busy} busy={busy === 'restore'} onPress={() => void action('restore', billing.restore)} />
    </>}
    <ActionButton secondary label="Gerenciar assinaturas na Google Play" disabled={!!busy} onPress={() => { void Linking.openURL('https://play.google.com/store/account/subscriptions').catch(() => setFeedback({ uid: uid ?? '', text: 'Abra Google Play → Pagamentos e assinaturas → Assinaturas.' })); }} />
    <ActionButton secondary label="Privacidade e exclusão de conta" onPress={() => router.navigate('/privacy')} />
    {feedback && feedback.uid === (uid ?? '') && <Text accessibilityLiveRegion="polite" style={ui.body}>{feedback.text}</Text>}
  </View>;
}
