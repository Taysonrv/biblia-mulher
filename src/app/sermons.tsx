import { useRef, useState } from 'react';
import { Text, View, type ScrollView } from 'react-native';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { FeatureLink, IconBadge, useUi } from '@/components/modern-ui';
import { ActionButton, SearchField } from '@/components/ui-controls';
import { useSavedSermons } from '@/hooks/use-saved-sermons';
import { findSermons } from '@/services/sermon-repository';
export default function SermonsScreen() {
  const ui = useUi(); const s = useMinisterialStyles(); const library = useSavedSermons(); const scroll = useRef<ScrollView>(null);
  const [query, setQuery] = useState(''); const [pageState, setPage] = useState({ query: '', page: 0 });
  const results = findSermons(library.entries, query); const last = Math.max(0, Math.ceil(results.length / 10) - 1);
  const page = Math.min(pageState.query === query ? pageState.page : 0, last);
  function turn(next: number) { setPage({ query, page: next }); scroll.current?.scrollTo({ y: 0, animated: true }); }
  return <MinisterialScreen title="Meus esboços" backTo="/support" scrollRef={scroll}>
    <Text style={ui.body}>Suas mensagens, prontas para continuar. Salvas neste aparelho e organizadas pela última edição.</Text>
    <FeatureLink title="Preparar nova mensagem" description="Comece por um tema ou passagem." icon="add-circle-outline" href="/sermon-builder" violet />
    {!!library.error && <View style={ui.card}><Text accessibilityRole="alert" style={s.error}>{library.error}</Text><ActionButton secondary label="Tentar carregar esboços" onPress={library.retry} /></View>}
    {!library.ready && !library.error && <Text style={ui.body}>Carregando suas mensagens…</Text>}
    {library.ready && !library.entries.length && <View style={ui.card}><IconBadge name="documents-outline" violet /><Text style={ui.heading}>Uma mensagem pode acompanhar sua jornada.</Text><Text style={ui.body}>Crie um esboço e toque em “Salvar esboço” para retomá-lo aqui. Você poderá adaptar os pontos e acrescentar suas notas pessoais.</Text></View>}
    {library.ready && !!library.entries.length && <>
      <SearchField label="Buscar meus esboços" placeholder="Tema, passagem ou uma nota pessoal" value={query} onChange={setQuery} maxLength={120} />
      <Text accessibilityLiveRegion="polite" style={ui.body}>{results.length} {results.length === 1 ? 'esboço encontrado' : 'esboços encontrados'} • {library.entries.length} na sua coleção</Text>
      {!results.length && <View style={ui.card}><Text style={ui.cardTitle}>Nenhum esboço com essa busca.</Text><Text style={ui.body}>Experimente outra palavra. Suas mensagens continuam salvas.</Text><ActionButton secondary label="Limpar busca de esboços" onPress={() => setQuery('')} /></View>}
      {results.slice(page * 10, page * 10 + 10).map(sermon => <View key={sermon.id} style={ui.card}>
        <Text style={ui.eyebrow}>MENSAGEM SALVA</Text><Text style={ui.heading}>{sermon.outline.theme}</Text><Text style={ui.body}>{sermon.outline.baseText}</Text>
        <Text style={ui.body}>Editado em {new Date(sermon.updatedAt).toLocaleDateString('pt-BR')}{sermon.notes ? ' • Com notas pessoais' : ''}</Text>
        <FeatureLink title="Retomar esboço" description={sermon.outline.theme} icon="document-text-outline" href={{ pathname: '/sermon-outline', params: { id: sermon.id } }} />
        <FeatureLink title="Agendar esta mensagem" description="Vincule este esboço a um compromisso futuro." icon="calendar-outline" href={{ pathname: '/agenda-event', params: { sermonId: sermon.id, sermonTitle: sermon.outline.theme } }} />
      </View>)}
      {last > 0 && <View style={ui.card}><Text style={ui.body}>Página {page + 1} de {last + 1}</Text><ActionButton secondary label="Página anterior de esboços" disabled={!page} onPress={() => turn(page - 1)} /><ActionButton label="Próxima página de esboços" disabled={page === last} onPress={() => turn(page + 1)} /></View>}
    </>}
    <FeatureLink title="Guardar um backup" description="Leve seus esboços e sua jornada com você." icon="shield-checkmark-outline" href="/my-data" />
  </MinisterialScreen>;
}
