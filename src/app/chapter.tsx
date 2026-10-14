import { useLayoutEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { FeatureLink, useUi } from '@/components/modern-ui';
import { useAppTheme } from '@/components/app-theme';
import { bibleTextProvider, chapterTranslation, verseKey, verseReference } from '@/data/bible-text';
import { ReaderOptions } from '@/components/reader-options';
import { useReaderPreferences } from '@/components/reader-preferences-provider';
import { readerTypography } from '@/services/reader-preferences-repository';
import { ActionButton } from '@/components/ui-controls';
import { useReadingJourney } from '@/hooks/use-reading-journey';
import { ChapterNavigation } from '@/components/chapter-navigation';
import { ChapterPlanProgress } from '@/components/chapter-plan-progress';
import { useReading } from '@/hooks/use-reading';
import { ReadingShare } from '@/components/reading-share';
export default function ChapterScreen() {
  const { palette: p } = useAppTheme();
  const ui = useUi();
  const s = useMinisterialStyles();
  const params = useLocalSearchParams<{ book?: string; chapter?: string; verse?: string; plan?: string; day?: string; fromSearch?: string; searchBook?: string }>();
  const book = typeof params.book === 'string' ? params.book : 'Salmos';
  const chapter = Number(params.chapter ?? 23);
  const label = chapterTranslation(book, chapter);
  const verses = bibleTextProvider.getChapter(book, chapter);
  const [selection, setSelection] = useState<{ route: string; verse: number } | null>(null);
  const route = book + ':' + chapter + ':' + (params.verse ?? '') + ':' + (params.plan ?? '') + ':' + (params.day ?? '');
  const requestedVerse = Number(params.verse ?? 0);
  const initialVerse = Number.isInteger(requestedVerse) && requestedVerse > 0 && requestedVerse <= (verses?.length ?? 0) ? requestedVerse : 0;
  const selected = selection?.route === route ? selection.verse : initialVerse;
  const scroll = useRef<ScrollView>(null);
  const anchor = useRef<{ route: string; y: number | null; height: number | null; scrolled: boolean }>({ route, y: null, height: null, scrolled: false });
  useLayoutEffect(() => { anchor.current = { route, y: null, height: null, scrolled: false }; }, [route]);
  function scrollToRequestedVerse() {
    const position = anchor.current;
    if (initialVerse && position.route === route && position.y !== null && position.height !== null && !position.scrolled && scroll.current) {
      position.scrolled = true;
      scroll.current.scrollTo({ y: Math.max(0, position.y - 12), animated: false });
    }
  }
  const reading = useReading();
  const journey = useReadingJourney(book, chapter);
  const reader = useReaderPreferences();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const typography = readerTypography(reader.preferences);
  const waitingForPreferences = !reader.ready && !reader.error;
  return <MinisterialScreen key={route} title={book + ' ' + chapter} preferBackTo={params.fromSearch === '1'} backTo={params.fromSearch === '1' ? { pathname: '/reading-search', params: { book: typeof params.searchBook === 'string' ? params.searchBook : '' } } : '/bible'} scrollRef={scroll} onContentSizeChange={(_, height) => {
    if (anchor.current.route === route) { anchor.current.height = height; scrollToRequestedVerse(); }
  }}>
    {verses && waitingForPreferences ? <Text style={s.body}>Preparando sua leitura…</Text> : verses ? <>
      <Text style={s.badge}>{label}</Text>
      <ActionButton secondary label="Trocar livro ou capítulo" onPress={() => router.push({ pathname: "/reading-picker", params: { book, chapter } })} />
      <ChapterNavigation book={book} chapter={chapter} planId={typeof params.plan === 'string' ? params.plan : undefined} day={Number(params.day)} />
      {!!journey.error && <View style={ui.card}><Text accessibilityRole="alert" style={s.error}>{journey.error}</Text><ActionButton secondary label="Tentar salvar histórico" onPress={journey.retry} /></View>}
      <Pressable accessibilityRole="button" accessibilityLabel={optionsOpen ? "Fechar ajustes da leitura" : "Personalizar leitura"} accessibilityState={{ expanded: optionsOpen }} onPress={() => setOptionsOpen(value => !value)} style={({ pressed }) => [ui.card, pressed && ui.pressed]}>
        <Text style={ui.cardTitle}>{optionsOpen ? "Fechar ajustes da leitura" : "Aa • Personalizar leitura"}</Text>
        <Text style={ui.body}>{reader.preferences.size === "large" ? "Texto grande" : reader.preferences.size === "medium" ? "Texto maior" : "Texto padrão"} • {reader.preferences.spacing === "wide" ? "Espaçamento amplo" : "Espaçamento regular"} • {reader.preferences.layout === "continuous" ? "Leitura contínua" : "Versículos em cards"}</Text>
      </Pressable>
      {optionsOpen && <ReaderOptions />}
      {!optionsOpen && !!reader.error && <View style={ui.card}><Text accessibilityRole="alert" style={s.error}>{reader.error}</Text><ActionButton secondary label="Tentar recuperar preferências" onPress={reader.retry} /></View>}
      <Text style={s.body}>Toque em um versículo para favoritar, anotar ou compartilhar. Toque novamente para fechar as ações.</Text>
      {!!reading.error && <Text accessibilityRole="alert" style={s.error}>{reading.error}</Text>}
      {verses.map((text, index) => {
        const verse = index + 1;
        const entry = reading.entries.find(item => item.verse === verse && item.book === book && item.chapter === chapter);
        return <View key={verse} style={{ gap: 12 }} onLayout={event => {
          if (verse === initialVerse && anchor.current.route === route) { anchor.current.y = event.nativeEvent.layout.y; scrollToRequestedVerse(); }
        }}>
          <Pressable accessibilityRole="button" accessibilityLabel={verseReference(verse, book, chapter) + '. ' + text} accessibilityState={{ selected: selected === verse }}
            onPress={() => setSelection({ route, verse: selected === verse ? 0 : verse })} style={({ pressed }) => [ui.card, reader.preferences.layout === "continuous" && { backgroundColor: "transparent", borderColor: "transparent", paddingHorizontal: 8, paddingVertical: 10, minHeight: 44 }, selected === verse && { borderColor: p.accent, backgroundColor: p.accentSurface }, pressed && ui.pressed]}>
            <Text style={s.badge}>{verse}{entry?.favorite ? '  ♥' : ''}{entry?.note ? '  • Anotação' : ''}</Text>
            <Text style={{ color: p.text, ...typography }}>{text}</Text>
          </Pressable>
          {selected === verse && <View style={ui.card}>
            <Text style={ui.cardTitle}>{verseReference(verse, book, chapter)}</Text>
            <ActionButton label={entry?.favorite ? "Remover dos favoritos" : "Favoritar versículo"} disabled={!reading.ready} busy={reading.busy} onPress={() => void reading.toggle(verse, book, chapter)} />
            <ActionButton secondary label={entry?.note ? "Editar anotação" : "Escrever anotação"} onPress={() => router.push({ pathname: "/verse-note", params: { verse, book, chapter } })} />
            <ReadingShare key={verseKey(verse, book, chapter)} entry={entry ?? { book, chapter, verse, favorite: false, note: '' }} />
            {!!entry?.note && <Text style={s.body}>{entry.note}</Text>}
          </View>}
        </View>;
      })}
      <ChapterNavigation book={book} chapter={chapter} planId={typeof params.plan === 'string' ? params.plan : undefined} day={Number(params.day)} />
      {typeof params.plan === 'string' && <ChapterPlanProgress id={params.plan} day={Number(params.day)} book={book} chapter={chapter} />}
      <FeatureLink title="Histórico de leitura" description="Retome os capítulos que você visitou." icon="time-outline" href="/reading-history" />
      <FeatureLink title="Meus favoritos" description="Retome os versículos que marcaram sua caminhada." icon="heart-outline" href="/favorites" />
      <Text style={ui.body}>Bíblia completa offline • Almeida 1911. Grafia histórica preservada; Salmos 23 mantém a atualização ortográfica já disponível no app.</Text>
    </> : <View style={ui.card}>
      <Text style={s.heading}>Capítulo não encontrado.</Text>
      <Text style={s.body}>Escolha um livro e um capítulo válido. Os 66 livros da Bíblia estão disponíveis offline.</Text>
      <FeatureLink title="Ler Salmos 23" description="Seis versículos sobre cuidado e confiança." icon="book-outline" href={{ pathname: '/chapter', params: { book: 'Salmos', chapter: '23' } }} />
    </View>}
  </MinisterialScreen>;
}
