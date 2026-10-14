import { withPremiumAccess } from '@/components/premium-access';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, Text, View, type ScrollView } from 'react-native';
import { router } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { IconBadge, useUi } from '@/components/modern-ui';
import { ActionButton, FilterChips, SearchField } from '@/components/ui-controls';
import { useAppTheme } from '@/components/app-theme';
import { bookStudies, wordStudies } from '@/services/studies';
import { MAX_STUDY_QUERY, searchStudies, studyResultPage, studySearchTerms, STUDY_SEARCH_PAGE_SIZE,
  type StudySearchKind, type StudySearchLanguage, type StudySearchTestament } from '@/services/study-search';

function StudySearchScreen() {
  const ui = useUi(); const { palette: p } = useAppTheme(); const scroll = useRef<ScrollView>(null); const resultsY = useRef(0);
  const [query, setQuery] = useState(''); const [kind, setKind] = useState<StudySearchKind>('Todos');
  const [testament, setTestament] = useState<StudySearchTestament>('Todos'); const [language, setLanguage] = useState<StudySearchLanguage>('Todos');
  const [page, setPage] = useState(0); const hasQuery = studySearchTerms(query).length > 0;
  const results = searchStudies(query, { kind, testament, language }); const paged = studyResultPage(results, page);
  function changeQuery(value: string) { setQuery(value); setPage(0); }
  function reset() { changeQuery(''); setKind('Todos'); setTestament('Todos'); setLanguage('Todos'); }
  function turn(next: number) { Keyboard.dismiss(); setPage(next); scroll.current?.scrollTo({ y: Math.max(0, resultsY.current - 12), animated: false }); }
  const scope = kind === 'Livros' && testament !== 'Todos' ? testament + ' Testamento' : kind === 'Palavras' && language !== 'Todos' ? language : kind;
  return <MinisterialScreen title="Buscar estudos" backTo="/studies" preferBackTo scrollRef={scroll}>
    <Text style={ui.body}>Encontre temas nos {bookStudies.length} panoramas de livros e nos {wordStudies.length} estudos de palavras. Todo o conteúdo pesquisado está disponível offline.</Text>
    <SearchField label="Tema, palavra ou referência dos estudos" placeholder="Paz, aliança, H7965, João 1:1…" maxLength={MAX_STUDY_QUERY} value={query} onChange={changeQuery} onSubmit={Keyboard.dismiss} />
    <FilterChips label="Tipo de estudo" values={['Todos', 'Livros', 'Palavras']} selected={kind} onSelect={value => { setKind(value as StudySearchKind); setTestament('Todos'); setLanguage('Todos'); setPage(0); }} />
    {kind === 'Livros' && <FilterChips label="Testamento dos estudos" values={['Todos', 'Antigo', 'Novo']} selected={testament} onSelect={value => { setTestament(value as StudySearchTestament); setPage(0); }} />}
    {kind === 'Palavras' && <FilterChips label="Idioma dos estudos" values={['Todos', 'Hebraico', 'Grego', 'Aramaico']} selected={language} onSelect={value => { setLanguage(value as StudySearchLanguage); setPage(0); }} />}
    {(query || kind !== 'Todos') && <ActionButton secondary label="Limpar busca e filtros de estudos" onPress={reset} />}
    {!hasQuery ? <View style={ui.card}>
      <IconBadge name="search-outline" /><Text style={ui.heading}>O que você quer compreender?</Text>
      <Text style={ui.body}>Busque uma ou mais palavras, em qualquer ordem. Você também pode usar a escrita original, a transliteração ou o número Strong.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {['paz', 'aliança', 'H7965', 'João 1:1'].map(example => <Pressable key={example} accessibilityRole="button" accessibilityLabel={'Buscar estudo sobre ' + example}
          onPress={() => { reset(); changeQuery(example); Keyboard.dismiss(); }} style={({ pressed }) => ({ minHeight: 44, borderRadius: 14, padding: 12, backgroundColor: p.accentSurface, opacity: pressed ? 0.7 : 1 })}>
          <Text style={[ui.cardTitle, { color: p.accent }]}>{example}</Text>
        </Pressable>)}
      </View>
    </View> : <View style={{ gap: 16 }} onLayout={event => { resultsY.current = event.nativeEvent.layout.y; }}>
      <Text accessibilityLiveRegion="polite" style={ui.body}>{results.length} {results.length === 1 ? 'estudo encontrado' : 'estudos encontrados'} • {scope}</Text>
      {!results.length ? <View style={ui.card}><Text style={ui.heading}>Nenhum estudo com essa busca.</Text><Text style={ui.body}>Tente outra palavra ou amplie os filtros. Esta busca cobre o conteúdo dos estudos; para pesquisar todos os versículos, use a busca da Bíblia.</Text></View> : <>
        {paged.rows.map(result => <Pressable key={`${result.kind}:${result.id}`} accessibilityRole="button" accessibilityLabel={'Abrir estudo: ' + result.title + '. ' + result.subtitle}
          onPress={() => { Keyboard.dismiss(); router.push(result.kind === 'Livros' ? { pathname: '/book-study', params: { book: result.id, fromStudySearch: '1' } }
            : { pathname: '/word-study', params: { word: result.id, fromStudySearch: '1' } }); }} style={({ pressed }) => [ui.card, pressed && ui.pressed]}>
          <Text style={ui.eyebrow}>{result.kind === 'Livros' ? 'PANORAMA DO LIVRO' : 'PALAVRA NO ORIGINAL'}</Text>
          <Text style={ui.heading}>{result.title}</Text><Text style={ui.body}>{result.subtitle}</Text>
          <View style={{ gap: 6 }}><Text style={[ui.cardTitle, { color: p.accent }]}>{result.matchedField}</Text><Text style={ui.body}>{result.excerpt}</Text></View>
          <Text style={[ui.cardTitle, { color: p.accent }]}>Abrir estudo →</Text>
        </Pressable>)}
        <Text style={ui.body}>Página {paged.page + 1} de {paged.pages} • {paged.page * STUDY_SEARCH_PAGE_SIZE + 1}–{paged.page * STUDY_SEARCH_PAGE_SIZE + paged.rows.length} de {results.length}</Text>
        {paged.pages > 1 && <View style={{ gap: 10 }}>
          <ActionButton secondary label="Estudos anteriores" disabled={paged.page === 0} onPress={() => turn(paged.page - 1)} />
          <ActionButton label="Próximos estudos" disabled={paged.page + 1 >= paged.pages} onPress={() => turn(paged.page + 1)} />
        </View>}
      </>}
    </View>}
  </MinisterialScreen>;
}

export default withPremiumAccess(StudySearchScreen, 'studies', '/studies');
