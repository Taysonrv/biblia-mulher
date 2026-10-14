import { useRef, useState } from 'react';
import { Keyboard, Pressable, Text, View, type ScrollView } from 'react-native';
import { router } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, IconBadge, useUi } from '@/components/modern-ui';
import { ActionButton, FilterChips, SearchField } from '@/components/ui-controls';
import { useAppTheme } from '@/components/app-theme';
import { usePersonalStudies } from '@/hooks/use-personal-studies';
import { useSubscription } from '@/components/subscription-provider';
import { findPersonalStudies, personalStudyInfo, personalStudyKey } from '@/services/personal-studies-repository';

export default function MyStudiesScreen() {
  const ui = useUi(); const { palette: p } = useAppTheme(); const state = usePersonalStudies();
  const { hasPremium } = useSubscription();
  const [query, setQuery] = useState(''); const [kind, setKind] = useState('Todos'); const [status, setStatus] = useState('Todos'); const [page, setPage] = useState(0);
  const scroll = useRef<ScrollView>(null); const resultsY = useRef(0);
  const results = findPersonalStudies(state.entries, query, kind, status); const pages = Math.ceil(results.length / 12); const currentPage = Math.max(0, Math.min(page, pages - 1));
  const savedCount = state.entries.filter(entry => entry.saved).length; const noteCount = state.entries.filter(entry => entry.note).length;
  function reset() { setQuery(''); setKind('Todos'); setStatus('Todos'); setPage(0); }
  function turn(next: number) { Keyboard.dismiss(); setPage(next); scroll.current?.scrollTo({ y: Math.max(0, resultsY.current - 12), animated: false }); }
  return <MinisterialScreen title="Meus estudos" backTo="/studies" preferBackTo scrollRef={scroll}>
    <Text style={ui.body}>Seus livros, palavras e reflexões em um só lugar. Retome o que despertou sua curiosidade.</Text>
    {!hasPremium && <View style={ui.card}><Text style={ui.body}>Suas reflexões continuam disponíveis no gratuito. Toque em um registro para ler e editar seu texto. O conteúdo completo dos estudos está no Premium.</Text><FeatureLink title="Conheça os estudos Premium" description="Explore o que está incluído na assinatura." icon="sparkles-outline" href="/subscription" /></View>}
    {state.ready && <Text style={[ui.cardTitle, { color: p.accent }]}>{savedCount} {savedCount === 1 ? 'estudo salvo' : 'estudos salvos'} • {noteCount} {noteCount === 1 ? 'reflexão' : 'reflexões'}</Text>}
    {!!state.error && <View style={ui.card}><Text accessibilityRole="alert" style={{ color: p.danger, lineHeight: 23 }}>{state.error}</Text><ActionButton secondary label="Tentar carregar meus estudos" onPress={state.retry} /></View>}
    {!state.ready && !state.error && <Text accessibilityLiveRegion="polite" style={ui.body}>Carregando seus estudos…</Text>}
    {state.ready && <>
      <SearchField label="Buscar nos meus estudos e reflexões" placeholder="Tema, palavra ou sua reflexão…" value={query} maxLength={120} onChange={value => { setQuery(value); setPage(0); }} onSubmit={Keyboard.dismiss} />
      <FilterChips label="Tipo dos meus estudos" values={['Todos', 'Livros', 'Palavras']} selected={kind} onSelect={value => { setKind(value); setPage(0); }} />
      <FilterChips label="Conteúdo dos meus estudos" values={['Todos', 'Salvos', 'Com reflexões']} selected={status} onSelect={value => { setStatus(value); setPage(0); }} />
      {!!(query || kind !== 'Todos' || status !== 'Todos') && <ActionButton secondary label="Limpar filtros de Meus estudos" onPress={reset} />}
      {!state.entries.length ? <View style={ui.card}><IconBadge name="bookmark-outline" /><Text style={ui.heading}>Sua próxima descoberta começa aqui.</Text><Text style={ui.body}>Abra um estudo de livro ou palavra para salvá-lo ou escrever sua primeira reflexão.</Text><FeatureLink title="Encontrar um estudo" description="Busque nos livros e nas palavras originais." icon="search-outline" href="/study-search" /></View>
        : <View style={{ gap: 16 }} onLayout={event => { resultsY.current = event.nativeEvent.layout.y; }}>
          <Text accessibilityLiveRegion="polite" style={ui.body}>{results.length} {results.length === 1 ? 'estudo encontrado' : 'estudos encontrados'}</Text>
          {!results.length && <View style={ui.card}><Text style={ui.heading}>Nenhum estudo com esses filtros.</Text><Text style={ui.body}>Tente outra palavra ou limpe os filtros para ver sua coleção.</Text></View>}
          {results.slice(currentPage * 12, (currentPage + 1) * 12).map(entry => {
            const info = personalStudyInfo(entry);
            return <Pressable key={personalStudyKey(entry)} accessibilityRole="button" accessibilityLabel={'Retomar estudo: ' + info.title}
              style={({ pressed }) => [ui.card, pressed && ui.pressed]} onPress={() => { Keyboard.dismiss(); router.push(!hasPremium ? { pathname: '/study-note', params: { kind: entry.kind, studyId: entry.studyId, fromMyStudies: '1' } } : entry.kind === 'book' ? { pathname: '/book-study', params: { book: entry.studyId, fromMyStudies: '1' } } : { pathname: '/word-study', params: { word: entry.studyId, fromMyStudies: '1' } }); }}>
              <Text style={ui.eyebrow}>{entry.kind === 'book' ? 'PANORAMA DO LIVRO' : 'PALAVRA NO ORIGINAL'}</Text>
              <Text style={ui.heading}>{info.title}</Text><Text style={ui.body}>{info.subtitle}</Text>
              <Text style={[ui.cardTitle, { color: p.accent }]}>{[entry.saved ? 'Salvo' : '', entry.note ? 'Com reflexão' : ''].filter(Boolean).join(' • ')}</Text>
              {!!entry.note && <Text style={ui.body}>{entry.note.length > 240 ? entry.note.slice(0, 240) + '…' : entry.note}</Text>}
              <Text style={ui.body}>Atualizado em {new Date(entry.updatedAt).toLocaleDateString('pt-BR')}</Text>
              <Text style={[ui.cardTitle, { color: p.accent }]}>{hasPremium ? 'Retomar estudo →' : 'Minha reflexão →'}</Text>
            </Pressable>;
          })}
          {pages > 1 && <><Text style={ui.body}>Página {currentPage + 1} de {pages}</Text><ActionButton secondary label="Meus estudos anteriores" disabled={!currentPage} onPress={() => turn(currentPage - 1)} /><ActionButton label="Próximos dos meus estudos" disabled={currentPage + 1 >= pages} onPress={() => turn(currentPage + 1)} /></>}
        </View>}
    </>}
    <FeatureLink title="Guardar meu backup" description="Leve estudos e reflexões para outro aparelho." icon="shield-checkmark-outline" href="/my-data" />
  </MinisterialScreen>;
}
