import { withPremiumAccess } from '@/components/premium-access';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { useUi } from '@/components/modern-ui';
import { useAppTheme } from '@/components/app-theme';
import { StudyFilters, StudySearch } from '@/components/study-ui';
import { searchWords } from '@/services/studies';
function WordStudiesScreen() {
  const ui = useUi(); const { palette: p } = useAppTheme(); const [query, setQuery] = useState(''); const [language, setLanguage] = useState('Todos');
  const results = searchWords(query, language);
  return <MinisterialScreen title="Palavras no original" backTo="/studies">
    <Text style={ui.body}>13 estudos introdutórios offline. Pesquise em português, na escrita original, pela transliteração ou pelo número Strong.</Text>
    <StudySearch label="Buscar palavra no original" placeholder="Amor, shalom, λόγος, H7965…" value={query} onChange={setQuery} />
    <StudyFilters values={['Todos', 'Hebraico', 'Grego', 'Aramaico']} selected={language} onSelect={setLanguage} />
    <Text accessibilityLiveRegion="polite" style={ui.eyebrow}>{results.length} {results.length === 1 ? 'PALAVRA ENCONTRADA' : 'PALAVRAS ENCONTRADAS'}</Text>
    {results.map(word => <Pressable key={word.id} accessibilityRole="button" accessibilityLabel={word.transliteration + ', ' + word.title + ', ' + word.language} style={({ pressed }) => [ui.card, pressed && ui.pressed]} onPress={() => router.push({ pathname: '/word-study', params: { word: word.id } })}>
      <Text style={{ color: p.accent, fontSize: 30, lineHeight: 46, writingDirection: word.language === 'Grego' ? 'ltr' : 'rtl', textAlign: word.language === 'Grego' ? 'left' : 'right' }}>{word.original}</Text>
      <Text style={ui.cardTitle}>{word.transliteration} • {word.title}</Text><Text style={ui.body}>{word.language} • {word.strong}</Text>
    </Pressable>)}
    {!results.length && <View style={ui.card}><Text style={ui.heading}>Nenhuma palavra encontrada.</Text><Text style={ui.body}>Experimente outra grafia ou selecione Todos.</Text></View>}
  </MinisterialScreen>;
}

export default withPremiumAccess(WordStudiesScreen, 'studies', '/studies');
