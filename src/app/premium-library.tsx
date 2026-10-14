import { Text, View } from 'react-native';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, IconBadge, OrbitCard, PremiumBadge, useUi } from '@/components/modern-ui';
import { withPremiumAccess } from '@/components/premium-access';
import { useSubscription } from '@/components/subscription-provider';
import { useContentCatalog } from '@/hooks/use-content-library';
import { useContentJourney } from '@/components/content-journey-provider';
import { JourneyFeedback } from '@/components/content-journey';
import { recentContentJourney } from '@/services/content-journey-model';
function PremiumLibraryScreen() {
  const ui = useUi(); const { mode, testAccess } = useSubscription();
  const catalog = useContentCatalog(); const journey = useContentJourney(); const recent = recentContentJourney(catalog.items, journey.entries);
  return <MinisterialScreen title="Mentorias e Pregações" backTo="/" preferBackTo>
    <OrbitCard violet><IconBadge name="play-circle-outline" violet /><PremiumBadge /><Text style={ui.heading}>Aprenda. Ouça. Coloque em prática.</Text><Text style={ui.body}>Uma biblioteca de orientação e mensagens para acompanhar sua jornada de fé.</Text></OrbitCard>
    <JourneyFeedback />
    {!!recent.length && <><Text style={ui.heading}>Continue sua jornada</Text>{recent.map(({ content, next, completed }) => <FeatureLink key={content.id} title={content.title} description={`${next.title} • ${completed}/${content.lessons.length} partes concluídas`} icon="play-circle-outline" href={{ pathname: '/content-watch', params: { id: content.id, lesson: next.id } }} />)}</>}
    <FeatureLink title="Mentorias" description="Aulas em vídeo e áudio, organizadas para aprofundar seu aprendizado." icon="school-outline" href="/mentorships" violet />
    <FeatureLink title="Pregações" description="Mensagens para assistir, ouvir e refletir, no seu tempo." icon="headset-outline" href="/preachings" />
    <View style={ui.card}><Text style={ui.heading}>Um momento para se dedicar.</Text><Text style={ui.body}>Escolha um ambiente tranquilo, acompanhe as referências na Bíblia e registre suas reflexões. Os conteúdos publicados são exclusivos do Premium.</Text></View>
    {(__DEV__ || testAccess) && mode === 'preview' && <FeatureLink title="Estúdio de testes" description="Monte uma prévia temporária com vídeos e áudios do próprio aparelho." icon="cloud-upload-outline" href="/content-studio" violet />}
  </MinisterialScreen>;
}
export default withPremiumAccess(PremiumLibraryScreen, 'media', '/');
