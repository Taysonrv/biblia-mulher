import { Text, View } from 'react-native';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, useUi } from '@/components/modern-ui';
import { ActionButton } from '@/components/ui-controls';
import { useReadingJourney } from '@/hooks/use-reading-journey';
import { useAppTheme } from '@/components/app-theme';
import { HISTORY_LIMIT } from '@/services/reading-journey-repository';

export default function ReadingHistoryScreen() {
  const journey = useReadingJourney(); const ui = useUi(); const { palette: p } = useAppTheme();
  return <MinisterialScreen title="Histórico de leitura" backTo="/profile">
    <Text style={ui.body}>Seus {HISTORY_LIMIT} capítulos mais recentes, salvos neste aparelho. Abrir um capítulo registra uma visita; isso não marca o capítulo como concluído.</Text>
    {!journey.ready && <Text style={ui.body}>Carregando histórico…</Text>}
    {!!journey.error && <View style={ui.card}><Text accessibilityRole="alert" style={{ color: p.danger }}>{journey.error}</Text><ActionButton secondary label="Tentar novamente" onPress={journey.retry} /></View>}
    {journey.ready && !journey.error && !journey.entries.length && <View style={ui.card}><Text style={ui.heading}>Sua caminhada começa com uma leitura.</Text><Text style={ui.body}>Os capítulos que você abrir aparecerão aqui.</Text><FeatureLink title="Começar em Gênesis" description="Gênesis 1 • disponível offline" icon="book-outline" href={{ pathname: '/chapter', params: { book: 'Gênesis', chapter: 1 } }} /></View>}
    {journey.ready && !journey.error && journey.entries.map((entry, index) => <FeatureLink key={entry.book + ':' + entry.chapter} title={entry.book + ' ' + entry.chapter}
      description={(index === 0 ? 'Última leitura • ' : '') + 'Visitado em ' + new Date(entry.visitedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
      icon="time-outline" href={{ pathname: '/chapter', params: { book: entry.book, chapter: entry.chapter } }} />)}
  </MinisterialScreen>;
}
