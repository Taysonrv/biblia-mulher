import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, PremiumBadge, useUi } from '@/components/modern-ui';
import { ActionButton } from '@/components/ui-controls';
import { withPremiumAccess } from '@/components/premium-access';
import { useContentCatalog } from '@/hooks/use-content-library';
import { formatMediaTime } from '@/services/premium-content-model';
import { ContentJourneyCard, JourneyFeedback } from '@/components/content-journey';
import { useContentJourney } from '@/components/content-journey-provider';
function PremiumContentScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>(); const ui = useUi(); const state = useContentCatalog(); const content = state.items.find(item => item.id === id); const journey = useContentJourney(); const record = journey.entries.find(item => item.contentId === id);
  const backTo = content?.kind === 'mentoria' ? '/mentorships' : content?.kind === 'pregacao' ? '/preachings' : '/premium-library';
  return <MinisterialScreen title={content?.title ?? 'Conteúdo Premium'} backTo={backTo} preferBackTo>
    {!state.ready && !state.error && <Text style={ui.body}>Abrindo conteúdo…</Text>}
    {!!state.error && <View style={ui.card}><Text accessibilityRole="alert" style={ui.body}>{state.error}</Text><ActionButton secondary label="Tentar abrir conteúdo" onPress={state.retry} /></View>}
    {state.ready && !content && <View style={ui.card}><Text style={ui.heading}>Conteúdo não encontrado.</Text><FeatureLink title="Voltar à biblioteca" description="Encontre mentorias e pregações disponíveis." icon="library-outline" href="/premium-library" /></View>}
    {content && <><PremiumBadge />{content.id.startsWith('preview-') && <Text style={ui.eyebrow}>TESTE LOCAL • NÃO PUBLICADO</Text>}
      <View style={ui.card}><Text style={ui.eyebrow}>{content.kind === 'mentoria' ? 'MENTORIA' : 'PREGAÇÃO'}</Text><Text style={ui.heading}>{content.presenter}</Text><Text style={ui.body}>{content.description}</Text>{!!content.topics.length && <Text style={ui.body}>{content.topics.join(' • ')}</Text>}</View>
      <JourneyFeedback /><ContentJourneyCard content={content} />
      <Text style={ui.heading}>{content.kind === 'mentoria' ? 'Aulas desta mentoria' : 'Acompanhe a mensagem'}</Text>
      {content.status === 'coming-soon' ? <View style={ui.card}><Text style={ui.cardTitle}>Disponível em breve.</Text><Text style={ui.body}>As partes serão liberadas assim que este conteúdo for publicado.</Text></View> : content.lessons.map((lesson, index) => <FeatureLink key={lesson.id} title={`${index + 1}. ${lesson.title}`} description={(record?.completed.includes(lesson.id) ? 'Concluída • ' : '') + (lesson.media === 'video' ? 'Assistir vídeo' : 'Ouvir áudio') + (lesson.durationSeconds ? ' • ' + formatMediaTime(lesson.durationSeconds) : '')} icon={record?.completed.includes(lesson.id) ? 'checkmark-circle-outline' : lesson.media === 'video' ? 'videocam-outline' : 'headset-outline'} href={{ pathname: '/content-watch', params: { id: content.id, lesson: lesson.id } }} />)}
    </>}
  </MinisterialScreen>;
}
export default withPremiumAccess(PremiumContentScreen, 'media', '/premium-library');
