import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { IconBadge, OrbitCard, useUi } from './modern-ui';
import { ActionButton } from './ui-controls';
import { useReadingJourney } from '@/hooks/use-reading-journey';
import { useAppTheme } from './app-theme';

export function ReadingResume() {
  const journey = useReadingJourney(); const ui = useUi(); const { palette: p } = useAppTheme();
  if (!journey.ready) return <View style={ui.card} accessibilityLiveRegion="polite">
    <Text style={ui.cardTitle}>Preparando sua leitura</Text><Text style={ui.body}>Recuperando o último capítulo neste aparelho…</Text>
  </View>;
  if (journey.error) return <View style={ui.card}>
    <Text style={ui.cardTitle}>Sua Bíblia continua disponível</Text>
    <Text accessibilityRole="alert" style={{ color: p.danger, lineHeight: 23 }}>{journey.error}</Text>
    <ActionButton secondary label="Tentar recuperar leitura" onPress={journey.retry} />
    <ActionButton label="Escolher um capítulo" onPress={() => router.push('/bible')} />
  </View>;
  const last = journey.lastRead;
  return <OrbitCard>
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
      <IconBadge name="book-outline" /><Text style={ui.eyebrow}>{last ? 'CONTINUE DE ONDE PAROU' : 'UM CAPÍTULO, UM NOVO COMEÇO'}</Text>
    </View>
    <View style={{ gap: 6 }}>
      <Text accessibilityRole="header" style={ui.heading}>{last ? `${last.book} · Capítulo ${last.chapter}` : 'Sua jornada começa aqui.'}</Text>
      <Text style={ui.body}>{last
        ? 'Último capítulo aberto neste aparelho em ' + new Date(last.visitedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '.'
        : 'Comece em Gênesis 1 ou escolha um livro. Todos os capítulos estão disponíveis para ler offline.'}</Text>
    </View>
    <ActionButton label={last ? 'Continuar leitura' : 'Começar em Gênesis 1'} onPress={() => router.push({ pathname: '/chapter', params: { book: last?.book ?? 'Gênesis', chapter: last?.chapter ?? 1 } })} />
    <ActionButton secondary label={last ? 'Ver histórico de leitura' : 'Escolher outro livro'} onPress={() => router.push(last ? '/reading-history' : '/bible')} />
  </OrbitCard>;
}
