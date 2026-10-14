import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FeatureLink, IconBadge, OrbitCard, PremiumBadge, ScreenFrame, ScreenHeading, useUi } from '@/components/modern-ui';
import { useAppTheme } from '@/components/app-theme';
import { bookStudies, wordStudies } from '@/services/studies';
export default function StudiesScreen() {
  const ui = useUi(); const { palette: p } = useAppTheme();
  return <ScreenFrame>
    <ScreenHeading eyebrow="BÍBLIA SMART • ESTUDOS" title="Conheça. Entenda. Viva."
      subtitle="Um olhar sobre cada livro e as palavras que dão forma à mensagem bíblica." />
    <FeatureLink title="Conheça o Premium" description="Estudos dos livros e palavras originais fazem parte da assinatura. Seus planos de leitura e reflexões pessoais continuam gratuitos." icon="sparkles-outline" href="/subscription" violet />
    <FeatureLink title="Buscar nos estudos" description="Encontre temas, autores, palavras originais e referências em um só lugar." icon="search-outline" href="/study-search" />
    <FeatureLink title="Meus estudos" description="Revisite livros e palavras salvos e suas reflexões pessoais." icon="bookmark-outline" href="/my-studies" />
    <FeatureLink title="Mentorias e Pregações" description="Aprenda com aulas e acompanhe mensagens em vídeo e áudio." icon="play-circle-outline" href="/premium-library" violet />
    <OrbitCard violet>
      <IconBadge name="library-outline" violet />
      <PremiumBadge />
      <Text style={[ui.eyebrow, { color: p.violet }]}>PANORAMA BÍBLICO</Text>
      <Text style={ui.heading}>Cada livro tem uma história.</Text>
      <Text style={ui.body}>Conheça autoria, data aproximada, mensagem principal e estrutura dos {bookStudies.length} livros presentes no app.</Text>
      <Pressable accessibilityRole="button" style={ui.button} onPress={() => router.push('/book-studies')}><Text style={ui.buttonText}>Explorar os livros</Text></Pressable>
    </OrbitCard>
    <FeatureLink title="Planos de leitura" description="Leia com constância e acompanhe seu progresso." icon="checkmark-circle-outline" href="/reading-plans" />
    <FeatureLink title="Palavras no original" description={wordStudies.length + ' estudos em hebraico, grego e aramaico. Escrita, transliteração e contexto.'} icon="language-outline" href="/word-studies" />
    <View style={{ gap: 14 }}>
      <Text style={ui.heading}>Comece por aqui</Text>
      <FeatureLink title="Gênesis • Origens e promessa" description="Da criação à história de uma família." icon="leaf-outline" href={{ pathname: '/book-study', params: { book: 'genesis' } }} />
      <FeatureLink title="João • Crer e receber vida" description="Sinais e encontros que revelam Jesus." icon="book-outline" href={{ pathname: '/book-study', params: { book: 'john' } }} violet />
      <FeatureLink title="Hesed • Bondade fiel" description="Uma palavra de cuidado em Salmos 23." icon="heart-outline" href={{ pathname: '/word-study', params: { word: 'hesed' } }} />
    </View>
    <View style={ui.card}><Text style={ui.heading}>Leia com contexto</Text><Text style={ui.body}>Primeiro observe a passagem inteira. Depois consulte a introdução do livro e examine como cada palavra funciona naquela frase.</Text></View>
  </ScreenFrame>;
}
