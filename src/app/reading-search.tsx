import { useRef, useState } from 'react';
import { Pressable, Text, View, type ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { useUi } from '@/components/modern-ui';
import { ActionButton, FilterChips, SearchField } from '@/components/ui-controls';
import { useAppTheme } from '@/components/app-theme';
import { bibleBooks, getBibleBook } from '@/data/bible-catalog';
import { verseReference } from '@/data/bible-text';
import { normalizeBibleSearch, resultPage, type SearchMode, type SearchTestament } from '@/services/bible-search';
import { useBibleSearch } from '@/hooks/use-bible-search';

export default function ReadingSearchScreen() {
  const params = useLocalSearchParams<{ book?: string }>();
  const book = typeof params.book === 'string' && getBibleBook(params.book) ? params.book : '';
  return <SearchContent key={book || 'all'} initialBook={book} />;
}
function SearchContent({ initialBook }: { initialBook: string }) {
  const ui = useUi(); const { palette: p } = useAppTheme(); const search = useBibleSearch();
  const [query, setQuery] = useState(''); const [mode, setMode] = useState<SearchMode>('Todas as palavras');
  const [testament, setTestament] = useState<SearchTestament>('Todos'); const [book, setBook] = useState(initialBook);
  const [filters, setFilters] = useState(false); const [bookQuery, setBookQuery] = useState(''); const [page, setPage] = useState(0);
  const scroll = useRef<ScrollView>(null); const resultsY = useRef(0);
  const choices = bibleBooks.filter(item => (testament === 'Todos' || testament === item.testament) && normalizeBibleSearch(item.name).includes(normalizeBibleSearch(bookQuery)));
  const result = search.result; const rows = result ? resultPage(result, page) : []; const pages = result ? Math.ceil(result.matches.length / 20) : 0;
  function invalidate() { search.clear(); setPage(0); }
  function run(value = query) { setPage(0); void search.start({ query: value, mode, testament, book }); }
  function navigatePage(value: number) { setPage(value); scroll.current?.scrollTo({ y: Math.max(0, resultsY.current - 12), animated: false }); }
  const scope = book || (testament === 'Todos' ? 'Toda a Bíblia' : testament + ' Testamento');
  return <MinisterialScreen title="Buscar versículos" preferBackTo backTo={initialBook ? { pathname: '/book', params: { book: initialBook } } : '/bible'} scrollRef={scroll}>
    <Text style={ui.body}>Encontre palavras, frases ou referências na Bíblia offline.</Text>
    <SearchField label="Palavra ou referência bíblica" placeholder="Ex.: esperança ou João 3:16" value={query} onChange={value => { setQuery(value); invalidate(); }} onSubmit={() => run()} />
    <FilterChips label="Modo de busca" values={['Todas as palavras', 'Frase exata']} selected={mode} onSelect={value => { setMode(value as SearchMode); invalidate(); }} />
    <ActionButton secondary label={'Filtros: ' + scope} onPress={() => setFilters(value => !value)} />
    {filters && <View style={ui.card}>
      <Text style={ui.cardTitle}>Testamento</Text>
      <FilterChips label="Testamento da busca" values={['Todos', 'Antigo', 'Novo']} selected={testament} onSelect={value => {
        const next = value as SearchTestament; setTestament(next);
        if (book && next !== 'Todos' && getBibleBook(book)?.testament !== next) setBook('');
        invalidate();
      }} />
      <Text style={ui.cardTitle}>Livro</Text><Text style={ui.body}>{book || 'Todos os livros do filtro atual'}</Text>
      {!!book && <ActionButton secondary label="Remover filtro de livro" onPress={() => { setBook(''); invalidate(); }} />}
      <SearchField label="Encontrar livro para filtro" placeholder="Digite o nome de um livro" value={bookQuery} onChange={setBookQuery} />
      {!bookQuery.trim() ? <Text style={ui.body}>Digite parte do nome e escolha um livro abaixo.</Text> : <>
        {!choices.length && <Text style={ui.body}>Nenhum livro encontrado neste testamento.</Text>}
        {choices.slice(0, 8).map(item => <Pressable key={item.name} accessibilityRole="button" accessibilityLabel={'Filtrar por ' + item.name}
          onPress={() => { setBook(item.name); setBookQuery(''); setFilters(false); invalidate(); }} style={({ pressed }) => [ui.card, book === item.name && { borderColor: p.accent }, pressed && ui.pressed]}>
          <Text style={ui.cardTitle}>{item.name}</Text><Text style={ui.body}>{item.testament} Testamento</Text>
        </Pressable>)}
        {choices.length > 8 && <Text style={ui.body}>Refine o nome para ver mais livros.</Text>}
      </>}
      <ActionButton secondary label="Fechar filtros" onPress={() => setFilters(false)} />
    </View>}
    <ActionButton label="Buscar" busy={search.busy} onPress={() => run()} />
    {search.busy && <><Text accessibilityLiveRegion="polite" style={ui.body}>Pesquisando a Bíblia neste aparelho…</Text><ActionButton secondary label="Cancelar busca" onPress={search.clear} /></>}
    {!!search.error && <Text accessibilityRole="alert" style={{ color: p.danger }}>{search.error}</Text>}
    <Text style={ui.body}>Na busca por palavras, acentos e maiúsculas não fazem diferença. A edição Almeida 1911 mantém grafia histórica; pesquise as palavras como aparecem na leitura.</Text>
    {!result && !search.busy && !search.error && <View style={ui.card}>
      <Text style={ui.cardTitle}>Experimente uma busca</Text>
      {['fé', 'João 3:16', 'Sl 23:1'].map(example => <ActionButton key={example} secondary label={'Buscar ' + example} onPress={() => { setQuery(example); run(example); }} />)}
    </View>}
    {result && <View style={{ gap: 16 }} onLayout={event => { resultsY.current = event.nativeEvent.layout.y; }}>
      <Text accessibilityRole="header" style={ui.heading}>Resultados</Text>
      <Text accessibilityLiveRegion="polite" style={ui.body}>{result.matches.length} {result.matches.length === 1 ? 'versículo encontrado' : 'versículos encontrados'} para “{result.query}” • {scope}</Text>
      {!rows.length ? <View style={ui.card}><Text style={ui.cardTitle}>Nenhum versículo encontrado.</Text><Text style={ui.body}>Tente outra palavra, confira a grafia ou amplie os filtros. Referências também respeitam o livro e o testamento selecionados.</Text></View> : <>
        <Text style={ui.body}>Toque no resultado para abrir o capítulo no versículo indicado.</Text>
        {rows.map(item => <Pressable key={item.book + ':' + item.chapter + ':' + item.verse} accessibilityRole="button" accessibilityLabel={verseReference(item.verse, item.book, item.chapter) + '. ' + item.text + ' Abrir capítulo.'}
          onPress={() => router.push({ pathname: '/chapter', params: { book: item.book, chapter: item.chapter, verse: item.verse, fromSearch: '1', searchBook: initialBook } })} style={({ pressed }) => [ui.card, pressed && ui.pressed]}>
          <Text style={[ui.cardTitle, { color: p.accent }]}>{verseReference(item.verse, item.book, item.chapter)}</Text><Text style={[ui.body, { color: p.text }]}>{item.text}</Text>
        </Pressable>)}
        <Text style={ui.body}>Página {page + 1} de {pages} • Resultados {page * 20 + 1}–{page * 20 + rows.length}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 120 }}><ActionButton secondary label="Resultados anteriores" disabled={page === 0} onPress={() => navigatePage(page - 1)} /></View>
          <View style={{ flex: 1, minWidth: 120 }}><ActionButton secondary label="Próximos resultados" disabled={page + 1 >= pages} onPress={() => navigatePage(page + 1)} /></View>
        </View>
      </>}
    </View>}
  </MinisterialScreen>;
}
