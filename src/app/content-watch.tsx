import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { useContentLibrary } from '@/components/content-provider';
import { ContentPlayer } from '@/components/content-player';
import { JourneyFeedback, LessonJourneyActions } from '@/components/content-journey';
import { useContentJourney } from '@/components/content-journey-provider';
import { withPremiumAccess } from '@/components/premium-access';
import { FeatureLink, PremiumBadge, useUi } from '@/components/modern-ui';
import { ActionButton } from '@/components/ui-controls';
import type { PlaybackGrant, PremiumContent } from '@/services/premium-content-model';
function ContentWatchContent({ id, lesson, retry }: { id?: string; lesson?: string; retry(): void }) {
  const ui = useUi(); const library = useContentLibrary();
  const journey = useContentJourney(); const { recordPosition } = journey;
  const [grant, setGrant] = useState<PlaybackGrant | null>(null); const [content, setContent] = useState<PremiumContent | null>(null); const [error, setError] = useState('');
  const request = useRef(0);
  const savePosition = useCallback(async (seconds: number, duration: number) => { if (content && lesson) await recordPosition(content, lesson, seconds, duration); }, [content, lesson, recordPosition]);
  useFocusEffect(useCallback(() => {
    const revision = ++request.current; let timer: ReturnType<typeof setTimeout> | undefined; setGrant(null); setContent(null); setError('');
    async function open() {
      try {
        if (!id || !lesson) throw Error();
        const item = await library.get(id); const source = await library.playback(id, lesson);
        if (revision !== request.current) return;
        setContent(item); setGrant(source);
        if (source.expiresAt) timer = setTimeout(() => { setGrant(null); setError('O acesso a esta mídia expirou. Abra novamente para continuar.'); }, Math.max(1, Math.min(2147483647, source.expiresAt - Date.now())));
      } catch { if (revision === request.current) setError('Não foi possível abrir este conteúdo. Confira sua conexão ou retorne à biblioteca.'); }
    }
    void open();
    return () => { request.current++; if (timer) clearTimeout(timer); setGrant(null); };
  }, [id, lesson, library]));
  const selected = content?.lessons.find(item => item.id === lesson); const backTo: Href = id ? { pathname: '/premium-content', params: { id } } : '/premium-library';
  const lessonIndex = content?.lessons.findIndex(item => item.id === lesson) ?? -1;
  const previous = lessonIndex > 0 ? content?.lessons[lessonIndex - 1] : undefined; const next = lessonIndex >= 0 ? content?.lessons[lessonIndex + 1] : undefined;
  const savedSeconds = journey.entries.find(item => item.contentId === id)?.positions?.find(item => item.lessonId === lesson)?.seconds ?? 0;
  return <MinisterialScreen title={selected?.title ?? 'Assistir ou ouvir'} backTo={backTo} preferBackTo>
    <PremiumBadge />{!!content && <View style={ui.card}><Text style={ui.heading}>{content.title}</Text><Text style={ui.body}>{content.presenter}</Text>{content.id.startsWith('preview-') && <Text style={ui.eyebrow}>TESTE LOCAL • NÃO PUBLICADO</Text>}</View>}
    {!grant && !error && <Text accessibilityLiveRegion="polite" style={ui.body}>Preparando reprodução…</Text>}
    {!!error && <View style={ui.card}><Text accessibilityRole="alert" style={ui.body}>{error}</Text><ActionButton secondary label="Tentar abrir conteúdo novamente" onPress={retry} /><FeatureLink title="Voltar à biblioteca" description="Encontre mentorias e pregações." icon="library-outline" href="/premium-library" /></View>}
    {!!grant && !journey.ready && !journey.error && <Text style={ui.body}>Carregando seu ponto de reprodução…</Text>}
    {!!grant && journey.ready && <ContentPlayer grant={grant} retry={retry} savedSeconds={savedSeconds} onPosition={savePosition} />}
    {!!grant && !!content && !!selected && <><JourneyFeedback /><LessonJourneyActions content={content} lessonId={selected.id} /></>}
    {!!grant && !!content && <>{previous && <FeatureLink title="Parte anterior" description={previous.title} icon="arrow-back-outline" href={{ pathname: '/content-watch', params: { id: content.id, lesson: previous.id } }} />}{next && <FeatureLink title="Próxima parte" description={next.title} icon="arrow-forward-outline" href={{ pathname: '/content-watch', params: { id: content.id, lesson: next.id } }} />}</>}
    <Text style={ui.body}>A reprodução pausa ao sair desta tela ou colocar o app em segundo plano. Conteúdos publicados precisam de conexão à internet.</Text>
    {!!content && content.lessons.length > 1 && <><Text style={ui.heading}>Outras partes deste conteúdo</Text>{content.lessons.filter(item => item.id !== lesson).map(item => <FeatureLink key={item.id} title={item.title} description={item.media === 'video' ? 'Abrir parte em vídeo' : 'Abrir parte em áudio'} icon={item.media === 'video' ? 'videocam-outline' : 'headset-outline'} href={{ pathname: '/content-watch', params: { id: content.id, lesson: item.id } }} />)}</>}
  </MinisterialScreen>;
}
function ContentWatchScreen() {
  const { id, lesson } = useLocalSearchParams<{ id?: string; lesson?: string }>(); const [attempt, setAttempt] = useState(0);
  return <ContentWatchContent key={`${id}:${lesson}:${attempt}`} id={id} lesson={lesson} retry={() => setAttempt(value => value + 1)} />;
}
export default withPremiumAccess(ContentWatchScreen, 'media', '/premium-library');
