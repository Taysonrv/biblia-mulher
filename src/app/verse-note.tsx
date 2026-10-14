import { useCallback, useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { bibleTextProvider, validReference, verseKey, verseReference } from '@/data/bible-text';
import { useAppTheme } from '@/components/app-theme';
import { useReading } from '@/hooks/use-reading';
export default function NoteScreen() {
  const { palette: p } = useAppTheme();
  const s = useMinisterialStyles();
  const { verse: param, book = 'Salmos', chapter: chapterParam = '23' } = useLocalSearchParams<{ verse?: string; book?: string; chapter?: string }>();
  const chapter = Number(chapterParam);
  const key = verseKey(Number(param), book, chapter);
  const verse = Number(param);
  const reading = useReading();
  const [draft, setDraft] = useState<{ key: string; value: string } | null>(null);
  useFocusEffect(useCallback(() => { setDraft(null); }, []));
  const stored = reading.entries.find(entry => entry.verse === verse && entry.book === book && entry.chapter === chapter)?.note ?? '';
  const value = draft?.key === key ? draft.value : stored;
  const valid = validReference(book, chapter, verse);
  async function save() {
    if (await reading.save(verse, value, book, chapter)) { setDraft(null); if (router.canGoBack()) router.back(); else router.replace('/notes'); }
  }
  return <MinisterialScreen title="Minha reflexão" backTo="/notes">
    {valid ? <>
      <Text style={s.badge}>{verseReference(verse, book, chapter)}</Text><Text style={s.body}>{bibleTextProvider.getChapter(book, chapter)?.[verse - 1]}</Text>
      <Text style={s.body}>O que esta passagem despertou em você?</Text>
      <TextInput accessibilityLabel="Anotação sobre o versículo" editable={reading.ready && !reading.busy} multiline maxLength={2000} style={s.input} placeholder="Escreva sua reflexão…" placeholderTextColor={p.subtle} value={value} onChangeText={text => setDraft({ key, value: text })} />
      <Text style={s.body}>{value.length}/2.000 caracteres. Para apagar uma anotação, limpe o campo e salve.</Text>
      {!!reading.error && <Text accessibilityRole="alert" style={s.error}>{reading.error}</Text>}
      <Pressable accessibilityRole="button" disabled={!reading.ready || reading.busy} style={s.button} onPress={() => void save()}><Text style={s.buttonText}>{reading.busy ? 'Salvando…' : 'Salvar anotação'}</Text></Pressable>
    </> : <Text style={s.error}>Versículo inválido. Volte à leitura para selecionar uma passagem.</Text>}
  </MinisterialScreen>;
}
