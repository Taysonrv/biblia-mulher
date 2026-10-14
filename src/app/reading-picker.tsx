import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, useUi } from '@/components/modern-ui';
import { ActionButton, FilterChips, SearchField } from '@/components/ui-controls';
import { bibleBooks, getBibleBook } from '@/data/bible-catalog';
import { normalizeStudyQuery } from '@/services/studies';
import { useAppTheme } from '@/components/app-theme';

export default function ReadingPickerScreen() {
  const ui = useUi(); const { palette: p } = useAppTheme();
  const params = useLocalSearchParams<{ book?: string; chapter?: string }>();
  const initial = typeof params.book === 'string' ? getBibleBook(params.book)?.name ?? null : null;
  const [selected, setSelected] = useState<string | null>(initial);
  const [query, setQuery] = useState(''); const [testament, setTestament] = useState('Todos');
  const book = selected ? getBibleBook(selected) : undefined;
  const results = bibleBooks.filter(item => (testament === 'Todos' || item.testament === testament) && normalizeStudyQuery(item.name).includes(normalizeStudyQuery(query)));
  return <MinisterialScreen key={selected ?? 'books'} title="Livro e capítulo" backTo="/bible">
    {book ? <>
      <Text accessibilityRole="header" style={ui.heading}>{book.name}</Text>
      <Text style={ui.body}>{book.chapters} {book.chapters === 1 ? 'capítulo disponível' : 'capítulos disponíveis'} offline. Escolha onde deseja ler.</Text>
      <ActionButton secondary label="Trocar livro" onPress={() => setSelected(null)} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{Array.from({ length: book.chapters }, (_, index) => index + 1).map(chapter => {
        const current = book.name === params.book && chapter === Number(params.chapter);
        return <Pressable key={chapter} accessibilityRole="button" accessibilityLabel={book.name + ' ' + chapter} accessibilityState={{ selected: current }}
          onPress={() => router.replace({ pathname: '/chapter', params: { book: book.name, chapter } })}
          style={({ pressed }) => ({ minWidth: 54, minHeight: 54, padding: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
            backgroundColor: current ? p.accentSurface : p.surface, borderWidth: 1, borderColor: current ? p.accent : p.border, opacity: pressed ? 0.65 : 1 })}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: current ? p.accent : p.text }}>{chapter}</Text>
        </Pressable>;
      })}</View>
    </> : <>
      <Text style={ui.body}>Escolha um dos 66 livros e, em seguida, o capítulo. Todo o texto está disponível offline.</Text>
      <SearchField label="Buscar livro para leitura" placeholder="Nome do livro" value={query} onChange={setQuery} />
      <FilterChips label="Testamento" values={['Todos', 'Antigo', 'Novo']} selected={testament} onSelect={setTestament} />
      {!results.length && <Text style={ui.body}>Nenhum livro encontrado. Tente outro nome ou selecione Todos.</Text>}
      {results.map(item => <Pressable key={item.name} accessibilityRole="button" accessibilityLabel={'Escolher ' + item.name} onPress={() => { setSelected(item.name); setQuery(''); }}
        style={({ pressed }) => [ui.card, pressed && ui.pressed]}><Text style={ui.cardTitle}>{item.name}</Text><Text style={ui.body}>{item.chapters} {item.chapters === 1 ? 'capítulo' : 'capítulos'} • {item.testament} Testamento</Text></Pressable>)}
      <FeatureLink title="Ver histórico de leitura" description="Retome os capítulos que você já visitou." icon="time-outline" href="/reading-history" />
    </>}
  </MinisterialScreen>;
}
