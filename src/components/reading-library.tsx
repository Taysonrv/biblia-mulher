import { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, type ScrollView } from 'react-native';
import { MinisterialScreen, useMinisterialStyles } from './ministerial-screen';
import { FeatureLink, useUi } from './modern-ui';
import { verseKey, verseReference } from '@/data/bible-text';
import { useReading } from '@/hooks/use-reading';
import { savedBooks, savedLibraryPage, searchSavedLibrary, type SavedLibraryRequest } from '@/services/saved-library';
import { SearchField, FilterChips, ActionButton } from './ui-controls';
import { useAppTheme } from './app-theme';
import { ReadingShare } from './reading-share';
import type { ReadingEntry } from '@/services/reading-repository';
const PAGE_SIZE = 20;
export function ReadingLibrary({ notes = false }: { notes?: boolean }) {
  const ui = useUi(); const s = useMinisterialStyles(); const { palette: p } = useAppTheme();
  const reading = useReading(); const scroll = useRef<ScrollView>(null);
  const [query, setQuery] = useState(''); const [testament, setTestament] = useState<SavedLibraryRequest['testament']>('Todos');
  const [book, setBook] = useState(''); const [order, setOrder] = useState<SavedLibraryRequest['order']>('Ordem da Bíblia');
  const [filtersOpen, setFiltersOpen] = useState(false); const [booksOpen, setBooksOpen] = useState(false); const [pageState, setPage] = useState({ key: '', page: 0 });
  const [removed, setRemoved] = useState<Pick<ReadingEntry, 'book' | 'chapter' | 'verse'> | null>(null);
  const key = JSON.stringify([notes, query, testament, book, order]);
  const result = useMemo(() => {
    try { return { items: searchSavedLibrary(reading.entries, { notes, query, testament, book, order }), error: '' }; }
    catch (reason) { return { items: [], error: reason instanceof Error ? reason.message : 'Confira sua busca.' }; }
  }, [reading.entries, notes, query, testament, book, order]);
  const total = reading.entries.filter(entry => notes ? !!entry.note : entry.favorite).length;
  const books = savedBooks(reading.entries, notes, testament);
  const lastPage = Math.max(0, Math.ceil(result.items.length / PAGE_SIZE) - 1);
  const page = Math.min(pageState.key === key ? pageState.page : 0, lastPage);
  const items = savedLibraryPage(result.items, page, PAGE_SIZE);
  const filtered = !!query.trim() || testament !== 'Todos' || !!book;
  function clearFilters() { setQuery(''); setTestament('Todos'); setBook(''); }
  function changePage(next: number) { setPage({ key, page: next }); scroll.current?.scrollTo({ y: 0, animated: true }); }
  async function changeFavorite(entry: ReadingEntry) {
    if (await reading.setFavorite(entry.verse, !entry.favorite, entry.book, entry.chapter)) {
      if (entry.favorite) { setRemoved({ book: entry.book, chapter: entry.chapter, verse: entry.verse }); scroll.current?.scrollTo({ y: 0, animated: true }); }
      else if (removed && verseKey(entry.verse, entry.book, entry.chapter) === verseKey(removed.verse, removed.book, removed.chapter)) setRemoved(null);
    }
  }
  async function undoRemoval() {
    if (removed && await reading.setFavorite(removed.verse, true, removed.book, removed.chapter)) setRemoved(null);
  }
  return <MinisterialScreen title={notes ? 'Minhas anotações' : 'Meus favoritos'} backTo="/profile" scrollRef={scroll}>
    <Text style={s.body}>{notes ? 'Suas reflexões, ligadas à Palavra.' : 'Versículos para guardar e revisitar.'} Salvos neste aparelho.</Text>
    {!!reading.error && <View style={ui.card}><Text accessibilityRole="alert" style={s.error}>{reading.error}</Text><ActionButton secondary label="Tentar carregar novamente" disabled={reading.busy} onPress={reading.retry} /></View>}
    {!reading.ready && !reading.error && <Text style={s.body}>Carregando sua coleção…</Text>}
    {removed && <View style={ui.card}><Text accessibilityLiveRegion="polite" style={ui.body}>{verseReference(removed.verse, removed.book, removed.chapter)} removido dos favoritos. A anotação foi preservada.</Text><ActionButton secondary label="Desfazer remoção do favorito" disabled={!reading.ready} busy={reading.busy} onPress={() => void undoRemoval()} /></View>}
    {reading.ready && total > 0 && <>
      <SearchField label={notes ? 'Buscar nas anotações' : 'Buscar nos favoritos'} placeholder="Amor, reflexão ou João 3:16" value={query} onChange={setQuery} maxLength={120} />
      <Text style={ui.body}>Busque no versículo, na referência ou na anotação.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={filtersOpen ? 'Fechar filtros e organização' : 'Filtros e organização'} accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(value => !value)} style={({ pressed }) => [ui.card, pressed && ui.pressed]}>
        <Text style={ui.cardTitle}>{filtersOpen ? 'Fechar filtros e organização' : 'Filtros e organização'}</Text><Text style={ui.body}>{testament === 'Todos' ? 'Todos os testamentos' : `${testament} Testamento`} • {book || 'Todos os livros'} • {order}</Text>
      </Pressable>
      {filtersOpen && <View style={{ gap: 16 }}>
      <FilterChips label="Testamento dos itens salvos" values={['Todos', 'Antigo', 'Novo']} selected={testament} onSelect={value => { setTestament(value as typeof testament); setBook(''); }} />
      <Pressable accessibilityRole="button" accessibilityLabel={booksOpen ? 'Fechar filtro de livros' : 'Filtrar por livro'} accessibilityState={{ expanded: booksOpen }} onPress={() => setBooksOpen(value => !value)} style={({ pressed }) => [ui.card, pressed && ui.pressed]}>
        <Text style={ui.cardTitle}>{booksOpen ? 'Fechar filtro de livros' : 'Filtrar por livro'}</Text><Text style={ui.body}>{book || 'Todos os livros com itens salvos'}</Text>
      </Pressable>
      {booksOpen && <FilterChips label="Livro dos itens salvos" values={['Todos os livros', ...books]} selected={book || 'Todos os livros'} onSelect={value => setBook(value === 'Todos os livros' ? '' : value)} />}
      <View style={{ gap: 10 }}><Text style={ui.cardTitle}>Organizar coleção</Text><FilterChips label="Ordem da coleção" values={['Ordem da Bíblia', 'Ordem salva']} selected={order} onSelect={value => setOrder(value as typeof order)} /></View>
      </View>}
      {filtered && <ActionButton secondary label="Limpar busca e filtros" onPress={clearFilters} />}
      {!!result.error && <Text accessibilityRole="alert" style={s.error}>{result.error}</Text>}
      {!result.error && <Text accessibilityLiveRegion="polite" style={ui.body}>{result.items.length} {notes ? (result.items.length === 1 ? 'anotação encontrada' : 'anotações encontradas') : (result.items.length === 1 ? 'versículo encontrado' : 'versículos encontrados')} • {total} {notes ? 'na sua coleção' : total === 1 ? 'salvo' : 'salvos'}</Text>}
      {!result.error && !items.length && <View style={ui.card}><Text style={ui.heading}>Nenhum resultado por aqui.</Text><Text style={ui.body}>Experimente outra palavra ou limpe os filtros. Seus itens salvos continuam na coleção.</Text></View>}
      {items.map(({ entry, text }) => <View key={verseKey(entry.verse, entry.book, entry.chapter)} style={ui.card}>
        <Text style={s.badge}>{verseReference(entry.verse, entry.book, entry.chapter)}</Text>
        <Text style={s.body}>{text}</Text>
        {notes && <View style={{ borderLeftWidth: 3, borderLeftColor: p.violet, paddingLeft: 12, gap: 6 }}><Text style={ui.eyebrow}>SUA REFLEXÃO</Text><Text style={{ color: p.text, fontSize: 16, lineHeight: 25 }}>{entry.note}</Text></View>}
        {!notes && !!entry.note && <Text style={ui.body}>Com anotação</Text>}
        <FeatureLink title="Abrir versículo" description={verseReference(entry.verse, entry.book, entry.chapter)} icon="book-outline" href={{ pathname: '/chapter', params: { verse: entry.verse, book: entry.book, chapter: entry.chapter } }} />
        <FeatureLink title={entry.note ? 'Editar reflexão' : 'Escrever reflexão'} description={verseReference(entry.verse, entry.book, entry.chapter)} icon="create-outline" href={{ pathname: '/verse-note', params: { verse: entry.verse, book: entry.book, chapter: entry.chapter } }} violet />
        <ActionButton secondary label={entry.favorite ? 'Remover dos favoritos' : 'Favoritar versículo'} disabled={!reading.ready} busy={reading.busy} onPress={() => void changeFavorite(entry)} />
        <ReadingShare entry={entry} />
      </View>)}
      {!result.error && result.items.length > PAGE_SIZE && <View style={ui.card}>
        <Text style={ui.body}>Página {page + 1} de {lastPage + 1} • mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, result.items.length)}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><View style={{ flex: 1, minWidth: 120 }}><ActionButton secondary label="Página anterior" disabled={page === 0} onPress={() => changePage(page - 1)} /></View><View style={{ flex: 1, minWidth: 120 }}><ActionButton label="Próxima página" disabled={page === lastPage} onPress={() => changePage(page + 1)} /></View></View>
      </View>}
    </>}
    {reading.ready && !total && <View style={ui.card}><Text style={s.heading}>{notes ? 'Sua primeira reflexão começa aqui.' : 'Guarde uma palavra para hoje.'}</Text><Text style={s.body}>Abra Salmos 23 e toque em um versículo para {notes ? 'escrever uma anotação' : 'favoritar'}.</Text></View>}
    <FeatureLink title="Ler Salmos 23" description="Continue sua leitura." icon="book-outline" href={{ pathname: '/chapter', params: { book: 'Salmos', chapter: '23' } }} />
  </MinisterialScreen>;
}
