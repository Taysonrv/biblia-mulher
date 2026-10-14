import { withPremiumAccess } from '@/components/premium-access';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, OrbitCard, useUi } from '@/components/modern-ui';
import { useAppTheme } from '@/components/app-theme';
import { StudySection, StudySourceLink } from '@/components/study-ui';
import { getBookStudy, getWordStudy } from '@/services/studies';
import { validReference } from '@/data/bible-text';
import { StudyPersonalActions } from '@/components/study-personal-actions';
function WordStudyScreen() {
  const ui = useUi(); const { palette: p } = useAppTheme(); const { word: param, fromStudySearch, fromMyStudies } = useLocalSearchParams<{ word?: string; fromStudySearch?: string; fromMyStudies?: string }>();
  const backTo = fromMyStudies === '1' ? '/my-studies' : fromStudySearch === '1' ? '/study-search' : '/word-studies';
  const preferBackTo = fromStudySearch === '1' || fromMyStudies === '1';
  const word = getWordStudy(param ?? '');
  if (!word) return <MinisterialScreen title="Palavra no original" backTo={backTo} preferBackTo={preferBackTo}><Text style={ui.heading}>Palavra não encontrada.</Text><FeatureLink title="Explorar palavras" description="Escolha um estudo no catálogo." icon="language-outline" href="/word-studies" /></MinisterialScreen>;
  const example = word.example; const reference = example.book + ' ' + example.chapter + ':' + example.verse;
  const available = validReference(example.book, example.chapter, example.verse); const book = getBookStudy(example.book);
  return <MinisterialScreen key={word.id} title={word.transliteration} backTo={backTo} preferBackTo={preferBackTo}>
    <Text style={ui.eyebrow}>{word.language.toUpperCase()} • STRONG {word.strong}</Text>
    <OrbitCard violet><Text selectable accessibilityLabel={'Escrita original: ' + word.original} style={{ color: p.text, fontSize: 38, lineHeight: 58, writingDirection: word.language === 'Grego' ? 'ltr' : 'rtl', textAlign: word.language === 'Grego' ? 'left' : 'right' }}>{word.original}</Text>
      <Text style={ui.heading}>{word.title}</Text><Text style={ui.body}>Transliteração: {word.transliteration}</Text><Text style={ui.body}>A transliteração representa as letras em caracteres latinos; diferentes sistemas podem variar.</Text></OrbitCard>
    <StudySection title="Sentidos possíveis"><Text selectable style={ui.body}>{word.meaning}</Text></StudySection>
    <StudySection title="Na passagem"><Text style={ui.cardTitle}>{reference}</Text><Text selectable style={ui.body}>{example.context}</Text><Text style={ui.body}>A forma encontrada no versículo pode ser flexionada. Aqui mostramos a forma de dicionário.</Text>
      {available ? <FeatureLink title="Ler a passagem" description={reference + ' • disponível offline'} icon="book-outline" href={{ pathname: '/chapter', params: { book: example.book, chapter: example.chapter, verse: example.verse } }} /> : <Text style={ui.body}>O texto deste capítulo ainda está em preparação no app. A explicação de contexto acima já está disponível offline.</Text>}
    </StudySection>
    <StudySection title="Observe o contexto"><Text style={ui.body}>{word.note}</Text></StudySection>
    <StudySection title="Para refletir"><Text style={ui.body}>{word.reflection}</Text></StudySection>
    <StudyPersonalActions kind="word" studyId={word.id} fromStudySearch={fromStudySearch} fromMyStudies={fromMyStudies} />
    {book && <FeatureLink title={'Conhecer ' + book.name} description="Autoria, data, mensagem principal e estrutura." icon="library-outline" href={{ pathname: '/book-study', params: { book: book.id } }} />}
    <StudySection title="Fonte e consulta"><Text style={ui.body}>Definições breves adaptadas em português pela Bíblia Smart a partir dos léxicos STEP Bible, de Tyndale House. Licença CC BY 4.0. Os exemplos e perguntas são comentários introdutórios do app.</Text>
      <StudySourceLink {...word.source} /><StudySourceLink label={'Consultar ' + word.strong + ' no STEP Bible'} url={word.lexiconUrl} /><StudySourceLink label="Licença CC BY 4.0" url="https://creativecommons.org/licenses/by/4.0/" />
    </StudySection>
  </MinisterialScreen>;
}

export default withPremiumAccess(WordStudyScreen, 'studies', '/studies');
