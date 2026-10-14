import { withPremiumAccess } from '@/components/premium-access';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, OrbitCard, useUi } from '@/components/modern-ui';
import { StudySection, StudySourceLink } from '@/components/study-ui';
import { getBookStudy, wordsForBook } from '@/services/studies';
import { availableChapters } from '@/data/bible-text';
import { StudyPersonalActions } from '@/components/study-personal-actions';
function BookStudyScreen() {
  const ui = useUi(); const { book: param, fromStudySearch, fromMyStudies } = useLocalSearchParams<{ book?: string; fromStudySearch?: string; fromMyStudies?: string }>();
  const backTo = fromMyStudies === '1' ? '/my-studies' : fromStudySearch === '1' ? '/study-search' : '/book-studies';
  const preferBackTo = fromStudySearch === '1' || fromMyStudies === '1';
  const book = getBookStudy(param ?? '');
  if (!book) return <MinisterialScreen title="Estudo do livro" backTo={backTo} preferBackTo={preferBackTo}><Text style={ui.heading}>Estudo não encontrado.</Text><FeatureLink title="Explorar os livros" description="Escolha uma introdução no catálogo." icon="library-outline" href="/book-studies" /></MinisterialScreen>;
  const words = wordsForBook(book.name); const chapters = availableChapters(book.name);
  return <MinisterialScreen key={book.id} title={book.name} backTo={backTo} preferBackTo={preferBackTo}>
    <Text style={ui.eyebrow}>{book.testament.toUpperCase()} TESTAMENTO • {book.genre.toUpperCase()}</Text>
    <OrbitCard><Text style={ui.eyebrow}>MENSAGEM PRINCIPAL</Text><Text style={ui.heading}>{book.message}</Text></OrbitCard>
    <StudySection title="Autor"><Text selectable style={ui.body}>{book.author}</Text></StudySection>
    <StudySection title="Data e composição"><Text selectable style={ui.body}>{book.date}</Text><Text style={ui.body}>As datas são aproximadas. É importante distinguir o período narrado da época de composição e reconhecer as diferentes propostas de estudo.</Text></StudySection>
    <StudySection title="Esboço do livro">{book.outline.map((item, index) => <View key={item.title} style={{ gap: 4 }}>
      <Text style={ui.cardTitle}>{index + 1}. {item.title}</Text><Text style={ui.body}>{book.chapters === 1 ? 'Capítulo único' : 'Capítulos ' + item.range}</Text>
    </View>)}</StudySection>
    <StudySection title="Para refletir"><Text style={ui.body}>{book.reflection}</Text></StudySection>
    <StudyPersonalActions kind="book" studyId={book.id} fromStudySearch={fromStudySearch} fromMyStudies={fromMyStudies} />
    {!!words.length && <View style={{ gap: 12 }}><Text style={ui.heading}>Palavras deste livro</Text>{words.map(word => <FeatureLink key={word.id} title={word.transliteration + ' • ' + word.title} description={word.language + ' • ' + word.example.book + ' ' + word.example.chapter + ':' + word.example.verse} icon="language-outline" href={{ pathname: '/word-study', params: { word: word.id } }} />)}</View>}
    <FeatureLink title="Explorar capítulos" description={chapters.length ? 'Todos os ' + chapters.length + (chapters.length === 1 ? ' capítulo disponível offline.' : ' capítulos disponíveis offline.') : 'O texto deste livro está em preparação. A introdução já está disponível.'} icon="book-outline" href={{ pathname: '/book', params: { book: book.name, chapters: book.chapters } }} />
    <StudySection title="Fontes para aprofundar"><Text style={ui.body}>Resumo introdutório da Bíblia Smart. As fontes abaixo apresentam perspectivas de estudo e abrem no navegador.</Text>{book.sources.map(source => <StudySourceLink key={source.url} {...source} />)}</StudySection>
  </MinisterialScreen>;
}

export default withPremiumAccess(BookStudyScreen, 'studies', '/studies');
