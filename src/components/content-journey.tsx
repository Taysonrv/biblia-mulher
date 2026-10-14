import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from './app-theme';
import { FeatureLink, useUi } from './modern-ui';
import { ActionButton } from './ui-controls';
import { useContentJourney } from './content-journey-provider';
import { summarizeContentJourney } from '@/services/content-journey-model';
import type { PremiumContent } from '@/services/premium-content-model';

export function JourneyFeedback() {
  const journey = useContentJourney(); const ui = useUi();
  if (!journey.error) return null;
  return <View style={ui.card}><Text accessibilityRole="alert" style={ui.body}>{journey.error}</Text>{!journey.ready && <ActionButton secondary label="Tentar abrir meu progresso" disabled={journey.busy} onPress={journey.retry} />}</View>;
}
export function ContentJourneyCard({ content }: { content: PremiumContent }) {
  const journey = useContentJourney(); const ui = useUi(); const { palette: p } = useAppTheme();
  const entry = journey.entries.find(row => row.contentId === content.id); const summary = summarizeContentJourney(content, entry);
  return <View style={ui.card}>
    <Text style={ui.heading}>Sua jornada neste conteúdo</Text>
    <Text accessibilityLiveRegion="polite" style={ui.body}>{!journey.ready ? 'Carregando seu progresso…' : content.status === 'coming-soon' ? 'Salve nos favoritos para encontrar quando estiver disponível.' : `${summary.completed} de ${summary.total} partes concluídas${summary.finished ? ' • Concluído' : ''}`}</Text>
    {content.status === 'published' && <View accessibilityRole="progressbar" accessibilityLabel="Progresso neste conteúdo" accessibilityValue={{ min: 0, max: summary.total, now: summary.completed }} style={{ height: 8, borderRadius: 4, backgroundColor: p.border }}><View style={{ width: `${summary.total ? summary.completed / summary.total * 100 : 0}%`, height: 8, borderRadius: 4, backgroundColor: p.accent }} /></View>}
    <ActionButton secondary label={summary.favorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'} disabled={!journey.ready || journey.busy} onPress={() => void journey.change(content, 'favorite')} />
    {journey.ready && summary.next && <FeatureLink title={summary.started ? 'Continuar conteúdo' : 'Começar conteúdo'} description={summary.next.title} icon="play-circle-outline" href={{ pathname: '/content-watch', params: { id: content.id, lesson: summary.next.id } }} />}
    {journey.ready && summary.finished && <Text style={ui.body}>Você concluiu todas as partes. Pode revisitar qualquer aula abaixo.</Text>}
    <Text style={ui.body}>Marque cada parte como concluída depois de assistir ou ouvir. {content.id.startsWith('preview-') ? 'Este progresso é temporário durante o teste.' : 'Seus registros ficam neste aparelho, sem sincronização por enquanto.'}</Text>
  </View>;
}
export function LessonJourneyActions({ content, lessonId }: { content: PremiumContent; lessonId: string }) {
  const { entries, ready, busy, change } = useContentJourney(); const ui = useUi();
  const visited = useRef(false);
  const completed = entries.find(row => row.contentId === content.id)?.completed.includes(lessonId) ?? false;
  useEffect(() => { if (ready && !busy && !visited.current) { visited.current = true; void change(content, 'visit', lessonId); } }, [ready, busy, change, content, lessonId]);
  return <View style={ui.card}><Text style={ui.heading}>{completed ? 'Parte concluída' : 'Registre seu avanço'}</Text><Text style={ui.body}>A conclusão é marcada por você, depois de acompanhar a mensagem.</Text><ActionButton label={completed ? 'Marcar como não concluída' : 'Marcar parte como concluída'} disabled={!ready || busy} onPress={() => void change(content, 'complete', lessonId)} /></View>;
}
