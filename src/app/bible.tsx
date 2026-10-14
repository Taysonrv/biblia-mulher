import { FeatureLink, ScreenHeading } from '@/components/modern-ui';
import { bibleBooks } from '@/data/bible-catalog';
import { useState } from 'react';
import { SearchField, FilterChips } from '@/components/ui-controls';
import { useAppTheme } from '@/components/app-theme';
import type { Palette } from '@/constants/design';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const oldTestament = bibleBooks.filter(book => book.testament === 'Antigo');
const newTestament = bibleBooks.filter(book => book.testament === 'Novo');

export default function BibleScreen() {
  const { palette: p } = useAppTheme();
  const styles = createStyles(p);
  const [query, setQuery] = useState('');
  const [testament, setTestament] = useState('Todos');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const matches = (book: { name: string }) => normalize(book.name).includes(normalize(query));
  const filteredOld = testament === 'Novo' ? [] : oldTestament.filter(matches);
  const filteredNew = testament === 'Antigo' ? [] : newTestament.filter(matches);
  function openBook(book: string, chapters: number) {
    router.push({
      pathname: '/book',
      params: {
        book,
        chapters: String(chapters),
      },
    });
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <ScreenHeading eyebrow="BÍBLIA" title="Explore a Palavra."
          subtitle="Leia, medite e encontre inspiração para sua caminhada." />
        <Text style={{ color: p.muted, lineHeight: 22 }}>Bíblia completa offline: 66 livros e 1.189 capítulos. Almeida 1911, com grafia histórica.</Text>
        <View style={{ marginTop: 18 }}><FeatureLink title="Buscar versículos" description="Encontre palavras, frases ou uma referência." icon="search-outline" href="/reading-search" violet /></View>
        <View style={{ marginTop: 18, marginBottom: 20, gap: 12 }}>
          <SearchField label="Buscar livro da Bíblia" placeholder="Buscar um livro" value={query} onChange={setQuery} />
          <FilterChips label="Testamento" values={['Todos', 'Antigo', 'Novo']} selected={testament} onSelect={setTestament} />
          <Text accessibilityLiveRegion="polite" style={{ color: p.muted, fontSize: 13 }}>
            {filteredOld.length + filteredNew.length} {filteredOld.length + filteredNew.length === 1 ? 'livro encontrado' : 'livros encontrados'}
          </Text>
        </View>
        {filteredOld.length === 0 && filteredNew.length === 0 ? <Text style={styles.subtitle}>Nenhum livro encontrado. Tente outro nome.</Text> : null}
        {!query.trim() && testament === 'Todos' && <><Text style={styles.sectionTitle}>Leitura sugerida</Text>

        <Pressable accessibilityRole="button" accessibilityLabel="Ler Salmos, capítulo 23"
          style={({ pressed }) => [styles.readingCard, pressed && { opacity: 0.72 }]}
          onPress={() => router.push({ pathname: '/chapter', params: { book: 'Salmos', chapter: '23' } })}
        >
          <View style={styles.readingTop}>
            <View>
              <Text style={styles.book}>Salmos</Text>
              <Text style={styles.chapter}>Capítulo 23</Text>
            </View>

            <Text style={styles.openIcon}>›</Text>
          </View>

        </Pressable></>}

        {filteredOld.length > 0 ? <Text style={styles.sectionTitle}>Antigo Testamento</Text> : null}

        {filteredOld.length > 0 ? <View style={styles.bookContainer}>
          {filteredOld.map((book) => (
            <Pressable accessibilityRole="button" accessibilityLabel={book.name + ', ' + book.chapters + (book.chapters === 1 ? ' capítulo' : ' capítulos')}
              key={book.name}
              style={({ pressed }) => [styles.bookRow, pressed && { backgroundColor: p.surfaceRaised }]}
              onPress={() => openBook(book.name, book.chapters)}
            >
              <View>
                <Text style={styles.bookName}>{book.name}</Text>
                <Text style={styles.bookChapters}>
                  {book.chapters}{' '}
                  {book.chapters === 1 ? 'capítulo' : 'capítulos'}
                </Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View> : null}

        {filteredNew.length > 0 ? <Text style={styles.sectionTitle}>Novo Testamento</Text> : null}

        {filteredNew.length > 0 ? <View style={styles.bookContainer}>
          {filteredNew.map((book) => (
            <Pressable accessibilityRole="button" accessibilityLabel={book.name + ', ' + book.chapters + (book.chapters === 1 ? ' capítulo' : ' capítulos')}
              key={book.name}
              style={({ pressed }) => [styles.bookRow, pressed && { backgroundColor: p.surfaceRaised }]}
              onPress={() => openBook(book.name, book.chapters)}
            >
              <View>
                <Text style={styles.bookName}>{book.name}</Text>
                <Text style={styles.bookChapters}>
                  {book.chapters}{' '}
                  {book.chapters === 1 ? 'capítulo' : 'capítulos'}
                </Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View> : null}
        <FeatureLink title="Histórico de leitura" description="Seus capítulos mais recentes neste aparelho." icon="time-outline" href="/reading-history" />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(p: Palette) { return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: p.background,
  },

  container: {
    padding: 20,
    paddingBottom: 50,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: p.text,
  },

  subtitle: {
    fontSize: 14,
    color: p.muted,
    marginTop: 6,
    marginBottom: 22,
    lineHeight: 21,
  },

  search: {
    marginTop: 24,
    height: 52,
    borderRadius: 16,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 28,
  },

  searchIcon: {
    fontSize: 25,
    color: p.accent,
    marginRight: 10,
  },

  searchText: {
    fontSize: 14,
    color: p.muted,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: p.text,
    marginBottom: 14,
    marginTop: 4,
  },

  readingCard: {
    borderWidth: 1,
    borderColor: p.accentBorder,
    backgroundColor: p.accentSurface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },

  readingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },

  book: {
    color: p.accent,
    fontSize: 13,
    fontWeight: '600',
  },

  chapter: {
    color: p.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 5,
  },

  openIcon: {
    color: p.text,
    fontSize: 32,
  },

  progressBackground: {
    height: 6,
    backgroundColor: p.accentBorder,
    borderRadius: 3,
  },

  progress: {
    width: '40%',
    height: 6,
    backgroundColor: p.surface,
    borderRadius: 3,
  },

  progressText: {
    color: p.accent,
    fontSize: 11,
    marginTop: 7,
  },

  bookContainer: {
    backgroundColor: p.surface,
    borderRadius: 18,
    marginBottom: 28,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: p.border,
  },

  bookRow: {
    borderBottomWidth: 1,
    borderBottomColor: p.border,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  bookName: {
    fontSize: 15,
    fontWeight: '600',
    color: p.text,
  },

  bookChapters: {
    fontSize: 13,
    color: p.muted,
    marginTop: 3,
  },

  arrow: {
    fontSize: 25,
    color: p.subtle,
  },
}); }