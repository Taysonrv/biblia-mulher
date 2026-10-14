import { FeatureLink } from '@/components/modern-ui';
import { getBookStudy } from '@/services/studies';
import { getBibleBook } from '@/data/bible-catalog';
import { useAppTheme } from '@/components/app-theme';
import type { Palette } from '@/constants/design';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

export default function BookScreen() {
  const { palette: p } = useAppTheme();
  const styles = createStyles(p);
  const params = useLocalSearchParams<{
    book: string;
    chapters: string;
  }>();

  const book = typeof params.book === 'string' ? params.book : '';
  const metadata = getBibleBook(book);
  const chapters = metadata?.chapters ?? 0;
  const study = getBookStudy(book);

  const chapterList = Array.from(
    { length: chapters },
    (_, index) => index + 1
  );

  function openChapter(chapter: number) {
    router.push({
      pathname: '/chapter',
      params: {
        book,
        chapter: String(chapter),
      },
    });
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Pressable
          accessibilityRole="button" accessibilityLabel="Voltar para Bíblia" style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.65 }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/bible')}
        >
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Bíblia</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>{metadata?.name ?? 'Livro não encontrado'}</Text>

          <Text style={styles.subtitle}>
            {metadata ? 'Todos os capítulos deste livro estão disponíveis offline, na edição Almeida 1911.' : 'Escolha um dos 66 livros disponíveis no catálogo da Bíblia.'}
          </Text>
        </View>

        {study && <View style={{ marginBottom: 24 }}><FeatureLink title="Conheça este livro" description="Autor, data, mensagem e esboço." icon="library-outline" href={{ pathname: '/book-study', params: { book: study.id } }} /></View>}
        {metadata && <View style={{ marginBottom: 24 }}><FeatureLink title="Buscar neste livro" description={'Encontre palavras e passagens em ' + metadata.name + '.'} icon="search-outline" href={{ pathname: '/reading-search', params: { book: metadata.name } }} /></View>}
        {metadata ? <Text style={styles.sectionTitle}>Capítulos</Text> : <FeatureLink title="Escolher livro" description="Encontre um livro e escolha o capítulo." icon="book-outline" href="/reading-picker" />}

        <View style={styles.chapterGrid}>
          {chapterList.map((chapter) => (
            <Pressable
              key={chapter}
              accessibilityRole="button" accessibilityLabel={'Capítulo ' + chapter + ' disponível'} style={({ pressed }) => [styles.chapterButton, { backgroundColor: p.accentSurface, borderColor: p.accent }, pressed && { opacity: 0.65 }]}
              onPress={() => openChapter(chapter)}
            >
              <Text style={styles.chapterNumber}>{chapter}</Text>
            </Pressable>
          ))}
        </View>
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

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 44,
    alignSelf: 'flex-start',
    paddingRight: 14,
  },

  backIcon: {
    fontSize: 32,
    color: p.accent,
    marginRight: 6,
    lineHeight: 32,
  },

  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: p.accent,
  },

  header: {
    marginBottom: 28,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: p.text,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: p.muted,
    marginTop: 7,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: p.text,
    marginBottom: 16,
  },

  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  chapterButton: {
    width: '17%',
    aspectRatio: 1,
    minWidth: 52,
    maxWidth: 64,
    borderRadius: 16,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chapterNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: p.accent,
  },
}); }