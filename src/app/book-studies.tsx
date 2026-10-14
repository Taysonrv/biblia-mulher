import { withPremiumAccess } from '@/components/premium-access';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, useUi } from '@/components/modern-ui';
import { StudyFilters, StudySearch } from '@/components/study-ui';
import { searchBooks } from '@/services/studies';
function BookStudiesScreen() {
  const ui = useUi(); const [query, setQuery] = useState(''); const [testament, setTestament] = useState('Todos');
  const results = searchBooks(query, testament);
  return <MinisterialScreen title="Estudo dos livros" backTo="/studies">
    <Text style={ui.body}>66 introduções disponíveis offline. Autoria, data aproximada, mensagem principal e esboço de leitura.</Text>
    <StudySearch label="Buscar estudo de livro" placeholder="Livro, autor ou tema" value={query} onChange={setQuery} />
    <StudyFilters values={['Todos', 'Antigo', 'Novo']} selected={testament} onSelect={setTestament} />
    <Text accessibilityLiveRegion="polite" style={ui.eyebrow}>{results.length} {results.length === 1 ? 'LIVRO ENCONTRADO' : 'LIVROS ENCONTRADOS'}</Text>
    {results.length ? results.map(book => <FeatureLink key={book.id} title={book.name} description={book.genre + ' • ' + book.testament + ' Testamento'} icon="book-outline" href={{ pathname: '/book-study', params: { book: book.id } }} violet={book.testament === 'Novo'} />)
      : <View style={ui.card}><Text style={ui.heading}>Nenhum estudo encontrado.</Text><Text style={ui.body}>Experimente outro nome ou escolha Todos.</Text></View>}
  </MinisterialScreen>;
}

export default withPremiumAccess(BookStudiesScreen, 'studies', '/studies');
