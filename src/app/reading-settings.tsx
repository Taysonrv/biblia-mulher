import { Text } from 'react-native';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { ReaderOptions } from '@/components/reader-options';
import { FeatureLink, useUi } from '@/components/modern-ui';
export default function ReadingSettingsScreen() {
  const ui = useUi();
  return <MinisterialScreen title="Sua leitura" backTo="/profile">
    <Text style={ui.body}>Ajuste a leitura para o seu conforto. Tudo funciona offline e sem uma conta.</Text>
    <ReaderOptions />
    <FeatureLink title="Experimentar na Bíblia" description="Abra Salmos 23 com suas preferências." icon="book-outline" href={{ pathname: '/chapter', params: { book: 'Salmos', chapter: '23' } }} />
  </MinisterialScreen>;
}
