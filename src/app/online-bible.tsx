import { readingReports } from '@/services/reading-reports';
import { brBible } from '@/services/br-bible';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { FeatureLink, useUi } from '@/components/modern-ui';
import { ActionButton, SearchField } from '@/components/ui-controls';
import { ONLINE_BIBLE, ENGLISH_BIBLE, onlineBible, englishBible, type OnlineBook, type OnlineChapter } from '@/services/online-bible';

export default function OnlineBibleScreen() {
  const params = useLocalSearchParams<{ language?: string; bookOrder?: string; chapter?: string }>();
  const english = params.language === 'en';
  const offline = params.language === 'pt-BR';
  return <BibleReader key={(offline ? 'br' : english ? 'en' : 'pt') + (params.bookOrder ?? '') + (params.chapter ?? '')} english={english} offline={offline} initialOrder={Number(params.bookOrder)} initialChapter={Number(params.chapter)} />;
}
function BibleReader({ english, offline, initialOrder, initialChapter }: { english: boolean; offline: boolean; initialOrder: number; initialChapter: number }) {
  const selected = english ? ENGLISH_BIBLE : ONLINE_BIBLE;
  const provider = offline ? brBible : english ? englishBible : onlineBible;
  const ui = useUi(); const s = useMinisterialStyles();
  const [books, setBooks] = useState<OnlineBook[]>([]); const [book, setBook] = useState<OnlineBook | null>(null);
  const [chapter, setChapter] = useState('1'); const [reading, setReading] = useState<OnlineChapter | null>(null);
  const [query, setQuery] = useState(''); const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0); const request = useRef({ value: 0 });
  useEffect(() => {
    let active = true; const sequence = request.current;
    provider.books().then(value => { if (active) { setBooks(value); const target = value.find(b => b.order === initialOrder); if (target && Number.isInteger(initialChapter) && initialChapter >= 1 && initialChapter <= target.chapters) void open(target, initialChapter); } }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível consultar os livros.'); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; sequence.value++; };
  }, // Initial passage is fixed by the keyed reader instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  [attempt, provider]);
  async function open(target: OnlineBook, number: number) {
    const token = ++request.current.value; setBook(target); setChapter(String(number)); setBusy(true); setError(''); setReading(null);
    try { const value = await provider.chapter(target, number); if (token === request.current.value) { setReading(value); if (offline) { try { await readingReports.record(target.name, number); } catch { if (token === request.current.value) setError('A leitura foi aberta, mas não foi possível registrar sua atividade. Tente novamente para atualizar os relatórios.'); } } } }
    catch (reason) { if (token === request.current.value) setError(reason instanceof Error ? reason.message : 'Não foi possível abrir o capítulo.'); }
    finally { if (token === request.current.value) setBusy(false); }
  }
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const valid = !!book && /^\d+$/.test(chapter) && Number(chapter) >= 1 && Number(chapter) <= book.chapters;
  return <MinisterialScreen title={offline ? "Bíblia Livre · Português BR" : english ? "Bíblia em inglês · WEB" : "Bíblia Livre online"} backTo="/bible">
    <Text style={ui.body}>{offline ? 'Bíblia Livre, edição de fevereiro de 2018: português do Brasil com grafia atual. Os 66 livros estão disponíveis sem internet. Esta leitura não altera suas anotações e favoritos da Almeida 1911.' : english ? 'World English Bible: 66 livros em inglês. Requer internet. Escolha um livro e capítulo para ler.' : 'Outra tradução em português, gratuita. Requer internet; a Almeida 1911 continua disponível na Bíblia offline. Aqui você consulta os versículos, sem alterar seus favoritos, notas ou histórico.'}</Text>
    <View style={ui.card}><Text style={ui.cardTitle}>Fonte e licença</Text><Text style={ui.body}>{selected.credit}</Text>
      <Pressable accessibilityRole="link" accessibilityLabel="Abrir fonte e licença da tradução" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => { void Linking.openURL(selected.license).catch(() => setError('Não foi possível abrir a página da licença.')); }}><Text style={[ui.body, { textDecorationLine: 'underline' }]}>Ver fonte e licença</Text></Pressable>
    </View>
    {!!error && <View style={ui.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text><ActionButton secondary label="Tentar consulta novamente" disabled={busy} onPress={() => { if (book) void open(book, Number(chapter)); else { setBusy(true); setError(''); setAttempt(value => value + 1); } }} /></View>}
    {busy && <ActivityIndicator accessibilityLabel="Consultando Bíblia online" />}
    {!book && !!books.length && <>
      <ActionButton secondary label={english ? "Read Psalm 23 · WEB" : "Ler Salmos 23 na Bíblia Livre"} onPress={() => { const psalm = books.find(item => item.id === 'PSA'); if (psalm) void open(psalm, 23); }} />
      <SearchField label="Buscar livro online" placeholder="Nome do livro" value={query} onChange={setQuery} maxLength={100} />
      {books.filter(item => normalize(item.name).includes(normalize(query))).map(item => <ActionButton key={item.id} secondary label={`${item.name} · ${item.chapters} capítulos`} onPress={() => { setBook(item); setChapter('1'); setReading(null); }} />)}
      {!books.some(item => normalize(item.name).includes(normalize(query))) && <Text style={ui.body}>Nenhum livro com essa busca.</Text>}
    </>}
    {!!book && <>
      <Text accessibilityRole="header" style={ui.heading}>{book.name}</Text>
      <Text style={ui.body}>Capítulo de 1 a {book.chapters}</Text>
      <TextInput accessibilityLabel="Capítulo da Bíblia online" keyboardType="number-pad" value={chapter} onChangeText={value => { request.current.value++; setBusy(false); setChapter(value); setReading(null); setError(''); }} maxLength={3} style={[s.input, { minHeight: 48 }]} />
      <ActionButton label={offline ? "Ler capítulo" : "Abrir capítulo online"} disabled={busy || !valid} onPress={() => void open(book, Number(chapter))} />
      <ActionButton secondary label="Escolher outro livro" onPress={() => { request.current.value++; setBook(null); setReading(null); setBusy(false); setError(''); }} />
    </>}
    {!!reading && <View style={{ gap: 18 }}>
      <Text accessibilityRole="header" style={ui.heading}>{reading.book.name} {reading.number} · {selected.name}</Text>
      {reading.verses.map(verse => <Text key={verse.number} selectable style={[ui.body, { fontSize: 18, lineHeight: 29 }]}><Text style={{ fontWeight: '700' }}>{verse.number} </Text>{verse.text}</Text>)}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <ActionButton secondary label="Capítulo anterior" disabled={busy || reading.number <= 1} onPress={() => void open(reading.book, reading.number - 1)} />
        <ActionButton secondary label="Próximo capítulo" disabled={busy || reading.number >= reading.book.chapters} onPress={() => void open(reading.book, reading.number + 1)} />
      </View>
      <Text style={ui.body}>{selected.credit} A consulta exibe o texto dos versículos; notas de rodapé e títulos editoriais da fonte não são apresentados.</Text>
    </View>}
    <FeatureLink title="Almeida 1911 · edição histórica" description="Grafia original; leitura com favoritos e anotações." icon="book-outline" href="/bible" />
  </MinisterialScreen>;
}
