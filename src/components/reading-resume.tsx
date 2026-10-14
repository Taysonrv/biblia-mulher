import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FeatureLink, useUi } from './modern-ui';
import { ActionButton } from './ui-controls';
import { useReadingJourney } from '@/hooks/use-reading-journey';
import { useAppTheme } from './app-theme';

export function ReadingResume() {
  const journey = useReadingJourney(); const ui = useUi(); const { palette: p } = useAppTheme();
  if (!journey.ready) return <Text style={ui.body}>Carregando sua última leitura…</Text>;
  if (journey.error) return <View style={ui.card}><Text accessibilityRole="alert" style={{ color: p.danger }}>{journey.error}</Text><ActionButton secondary label="Tentar recuperar leitura" onPress={journey.retry} /></View>;
  const last = journey.lastRead;
  return <View style={{ gap: 4 }}>
    <FeatureLink title={last ? 'Continuar leitura' : 'Começar leitura'} description={last ? last.book + ' • Capítulo ' + last.chapter : 'Gênesis 1 • Bíblia completa disponível offline'} icon="book-outline"
      href={{ pathname: '/chapter', params: { book: last?.book ?? 'Gênesis', chapter: last?.chapter ?? 1 } }} />
    {last && <Pressable accessibilityRole="button" accessibilityLabel="Ver histórico de leitura" onPress={() => router.push('/reading-history')}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 4, justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}>
      <Text style={{ color: p.accent, fontSize: 14, fontWeight: '600' }}>Ver histórico de leitura →</Text>
    </Pressable>}
  </View>;
}
