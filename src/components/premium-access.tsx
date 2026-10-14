import type { ComponentType, PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { MinisterialScreen } from './ministerial-screen';
import { FeatureLink, IconBadge, useUi } from './modern-ui';
import { ActionButton } from './ui-controls';
import { useSubscription } from './subscription-provider';
import { PREMIUM_FEATURES, type PremiumFeature } from '@/services/subscription-access';

export function PremiumBoundary({ feature, backTo, children }: PropsWithChildren<{ feature: PremiumFeature; backTo: Href }>) {
  const subscription = useSubscription(); const ui = useUi(); const info = PREMIUM_FEATURES[feature];
  if (subscription.hasPremium) return children;
  return <MinisterialScreen title={info.title} backTo={backTo} preferBackTo>
    <View style={ui.card}>
      <IconBadge name="lock-closed-outline" violet />
      <Text style={ui.eyebrow}>BÍBLIA SMART PREMIUM</Text>
      <Text accessibilityRole="header" style={ui.heading}>Aprofunde sua jornada.</Text>
      <Text style={ui.body}>{info.description}</Text>
      <Text style={ui.body}>{subscription.ready ? 'Este recurso faz parte da assinatura Premium.' : 'Verificando seu acesso…'}</Text>
      <ActionButton label="Conhecer o Premium" onPress={() => router.push('/subscription')} />
    </View>
    {!!subscription.error && <View style={ui.card}><Text accessibilityRole="alert" style={ui.body}>{subscription.error}</Text><ActionButton secondary label="Verificar acesso novamente" onPress={subscription.refresh} /></View>}
    <Text style={ui.body}>Sua Bíblia, favoritos, anotações, planos de leitura e agenda continuam gratuitos. Seus textos salvos permanecem disponíveis.</Text>
    <FeatureLink title="Meus estudos e reflexões" description="Acesse suas anotações pessoais." icon="bookmark-outline" href="/my-studies" />
    <FeatureLink title="Meus esboços salvos" description="Leia, edite e compartilhe seus próprios textos." icon="documents-outline" href="/sermons" />
    <FeatureLink title="Continuar lendo a Bíblia" description="Todos os livros disponíveis gratuitamente." icon="book-outline" href="/bible" />
  </MinisterialScreen>;
}
export function withPremiumAccess(Screen: ComponentType, feature: PremiumFeature, backTo: Href) {
  return function PremiumScreen() { return <PremiumBoundary feature={feature} backTo={backTo}><Screen /></PremiumBoundary>; };
}
