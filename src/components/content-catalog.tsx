import { useState } from 'react';
import { Text, View } from 'react-native';
import { MinisterialScreen } from './ministerial-screen';
import { FeatureLink, IconBadge, PremiumBadge, useUi } from './modern-ui';
import { ActionButton, FilterChips, SearchField } from './ui-controls';
import { useContentCatalog } from '@/hooks/use-content-library';
import { searchContent, type ContentKind } from '@/services/premium-content-model';
import { useSubscription } from './subscription-provider';
import { useContentJourney } from './content-journey-provider';
import { JourneyFeedback } from './content-journey';
import { filterContentJourney, summarizeContentJourney } from '@/services/content-journey-model';

export function ContentCatalog({ kind }: { kind: ContentKind }) {
  const ui = useUi(); const state = useContentCatalog(); const { mode, testAccess } = useSubscription();
  const journey = useContentJourney(); const [collection, setCollection] = useState('Catálogo');
  const [query, setQuery] = useState(''); const [media, setMedia] = useState('Todos'); const [page, setPage] = useState(0);
  const all = state.items.filter(item => item.kind === kind); const results = filterContentJourney(searchContent(state.items, kind, query, media), journey.entries, collection);
  const pages = Math.ceil(results.length / 12); const current = Math.max(0, Math.min(page, pages - 1)); const mentorship = kind === 'mentoria';
  return <MinisterialScreen title={mentorship ? 'Mentorias' : 'Pregações'} backTo="/premium-library" preferBackTo>
    <PremiumBadge /><Text style={ui.body}>{mentorship ? 'Aprenda com orientação e aprofunde sua caminhada, uma aula de cada vez.' : 'Reserve um momento para ouvir a Palavra e refletir sobre sua mensagem.'} Vídeos e áudios exclusivos para assinantes.</Text>
    <SearchField label={mentorship ? 'Buscar mentorias' : 'Buscar pregações'} placeholder="Título, tema ou responsável…" value={query} maxLength={120} onChange={value => { setQuery(value); setPage(0); }} />
    <FilterChips label="Formato do conteúdo" values={['Todos', 'Vídeos', 'Áudios']} selected={media} onSelect={value => { setMedia(value); setPage(0); }} />
    <FilterChips label="Minha coleção de conteúdos" values={['Catálogo', 'Favoritos', 'Em andamento', 'Concluídos']} selected={collection} onSelect={value => { setCollection(value); setPage(0); }} />
    <JourneyFeedback />
    {!journey.ready && collection !== 'Catálogo' && !journey.error && <Text style={ui.body}>Carregando sua coleção…</Text>}
    {!state.ready && !state.error && <Text accessibilityLiveRegion="polite" style={ui.body}>Preparando sua biblioteca…</Text>}
    {!!state.error && <View style={ui.card}><Text accessibilityRole="alert" style={ui.body}>{state.error}</Text><ActionButton secondary label="Tentar carregar conteúdos" onPress={state.retry} /></View>}
    {state.ready && (collection === 'Catálogo' || journey.ready) && (!all.length ? <View style={ui.card}><IconBadge name={mentorship ? 'school-outline' : 'headset-outline'} violet /><Text style={ui.heading}>{mentorship ? 'Novas mentorias estão chegando.' : 'Novas mensagens estão chegando.'}</Text><Text style={ui.body}>Assim que os conteúdos forem publicados, você poderá encontrá-los aqui para assistir ou ouvir.</Text></View> : <>
      <Text accessibilityLiveRegion="polite" style={ui.body}>{results.length} {results.length === 1 ? 'conteúdo encontrado' : 'conteúdos encontrados'}</Text>
      {!results.length && <View style={ui.card}><Text style={ui.heading}>Nenhum conteúdo com esses filtros.</Text><Text style={ui.body}>{collection === 'Favoritos' ? 'Salve conteúdos nos detalhes para encontrá-los aqui.' : collection === 'Em andamento' ? 'Abra uma aula para começar sua jornada.' : collection === 'Concluídos' ? 'Marque as partes como concluídas depois de acompanhá-las.' : 'Tente buscar outro título, tema ou responsável.'}</Text><ActionButton secondary label="Limpar filtros" onPress={() => { setQuery(''); setMedia('Todos'); setCollection('Catálogo'); setPage(0); }} /></View>}
      {results.slice(current * 12, (current + 1) * 12).map(item => {
        const progress = summarizeContentJourney(item, journey.entries.find(entry => entry.contentId === item.id));
        return <FeatureLink key={item.id} title={item.title} description={item.presenter + ' • ' + (item.status === 'coming-soon' ? 'Em breve' : `${progress.completed}/${item.lessons.length} partes concluídas`) + (progress.favorite ? ' • Favorito' : '') + (item.id.startsWith('preview-') ? ' • Teste local' : '')} icon={progress.finished ? 'checkmark-circle-outline' : mentorship ? 'school-outline' : 'play-circle-outline'} href={{ pathname: '/premium-content', params: { id: item.id } }} violet />;
      })}
      {pages > 1 && <><Text style={ui.body}>Página {current + 1} de {pages}</Text><ActionButton secondary label="Conteúdos anteriores" disabled={!current} onPress={() => setPage(current - 1)} /><ActionButton label="Próximos conteúdos" disabled={current + 1 >= pages} onPress={() => setPage(current + 1)} /></>}
    </>)}
    {(__DEV__ || testAccess) && mode === 'preview' && <FeatureLink title="Estúdio de testes" description="Adicione vídeos ou áudios deste aparelho para validar a experiência. Sem publicação." icon="cloud-upload-outline" href="/content-studio" />}
  </MinisterialScreen>;
}
