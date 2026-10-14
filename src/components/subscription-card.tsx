import { Text, View } from 'react-native';
import { FeatureLink, useUi } from './modern-ui';
import { useSubscription } from './subscription-provider';
export function SubscriptionCard() {
  const state = useSubscription(); const ui = useUi();
  const title = state.testAccess ? 'Premium liberado para testes' : state.mode === 'preview' ? 'Premium em simulação' : state.mode === 'premium' ? 'Você tem o Premium' : 'Você está no modo gratuito';
  return <View style={ui.card}>
    <Text style={ui.cardTitle}>{title}</Text>
    <Text style={ui.body}>{state.testAccess ? 'Estudos, ferramentas ministeriais e biblioteca liberados nesta versão de testes, sem assinatura ou cobrança.' : state.mode === 'preview' ? 'Teste de desenvolvimento, sem cobrança. A simulação termina ao reiniciar o app ou trocar de conta.' : state.mode === 'premium' ? 'Estudos e ferramentas ministeriais liberados pela sua assinatura.' : 'Leia a Bíblia e organize sua jornada. Explore os recursos da assinatura quando quiser.'}</Text>
    <FeatureLink title="Gratuito e Premium" description="Veja o que está incluído em cada modo." icon="sparkles-outline" href="/subscription" violet />
  </View>;
}
