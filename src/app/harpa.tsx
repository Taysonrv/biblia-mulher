import { useRef, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { useUi } from '@/components/modern-ui';
import { useAppTheme } from '@/components/app-theme';
import { ActionButton, FilterChips, SearchField } from '@/components/ui-controls';
import { hymns, searchHymns, type Hymn } from '@/services/harpa';

export default function HarpaScreen() {
  const ui = useUi(); const { palette: p } = useAppTheme(); const scroll = useRef<ScrollView>(null);
  const [query, setQuery] = useState(''); const [selected, setSelected] = useState<Hymn | null>(null);
  const [fontSize, setFontSize] = useState(20); const [credits, setCredits] = useState(false); const [error, setError] = useState('');
  const [category, setCategory] = useState('Todos');
  const matches = searchHymns(query).filter(item => category === 'Todos' || (category === 'Cívicos' ? item.category === 'civic' : item.category !== 'civic'));
  function choose(hymn: Hymn | null) { setSelected(hymn); setCredits(false); setError(''); scroll.current?.scrollTo({ y: 0, animated: false }); }
  return <MinisterialScreen title="Harpa Cristã" backTo="/profile" scrollRef={scroll}>
    {!selected ? <>
      <Text style={ui.heading}>Hinos para acompanhar seu louvor.</Text>
      <Text style={ui.body}>Seleção inicial de letras tradicionais, disponível offline e sem assinatura. Esta seleção ainda não contém o hinário completo.</Text>
      <SearchField label="Buscar hino por número ou título" placeholder="Número ou título do hino" value={query} onChange={setQuery} maxLength={120} />
      <FilterChips label="Categoria do hinário" values={['Todos', 'Louvor', 'Cívicos']} selected={category} onSelect={setCategory} />
      <Text accessibilityLiveRegion="polite" style={ui.body}>{matches.length} {matches.length === 1 ? 'hino encontrado' : 'hinos encontrados'} de {hymns.length} na seleção.</Text>
      {matches.map(hymn => <ActionButton key={hymn.number} secondary label={`${hymn.number} · ${hymn.title}${hymn.category === 'civic' ? ' · Cívico' : ''}`} onPress={() => choose(hymn)} />)}
      {!matches.length && <View style={ui.card}><Text style={ui.cardTitle}>Nenhum hino nesta busca</Text><Text style={ui.body}>Confira o número ou o título. Novas letras serão adicionadas à medida que suas fontes forem conferidas.</Text><ActionButton secondary label="Ver todos os hinos disponíveis" onPress={() => { setQuery(''); setCategory('Todos'); }} /></View>}
    </> : <>
      <ActionButton secondary label="Voltar à lista de hinos" onPress={() => choose(null)} />
      <Text style={ui.eyebrow}>HARPA CRISTÃ · HINO {selected.number}</Text>
      <Text accessibilityRole="header" style={ui.heading}>{selected.title}</Text>
      {selected.category === 'civic' && <Text style={ui.eyebrow}>APÊNDICE CÍVICO</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <ActionButton secondary label="Diminuir letra" disabled={fontSize <= 16} onPress={() => setFontSize(value => Math.max(16, value - 2))} />
        <ActionButton secondary label="Aumentar letra" disabled={fontSize >= 32} onPress={() => setFontSize(value => Math.min(32, value + 2))} />
      </View>
      {selected.verses.map((verse, i) => <View key={i} style={{ gap: 8, paddingVertical: 10 }}><Text style={ui.eyebrow}>{i + 1}ª ESTROFE</Text><Text selectable style={{ color: p.text, fontSize, lineHeight: Math.round(fontSize * 1.6) }}>{verse}</Text>{!!selected.chorus && <View style={[ui.card, { marginTop: 12, backgroundColor: p.accentSurface }]}><Text style={ui.eyebrow}>REFRÃO</Text><Text selectable style={{ color: p.text, fontSize, lineHeight: Math.round(fontSize * 1.6) }}>{selected.chorus}</Text></View>}</View>)}
      <View style={ui.card}>
        <Text style={ui.cardTitle}>Créditos</Text><Text style={ui.body}>{selected.author}</Text><Text style={ui.body}>{selected.portugueseCredit}</Text>
        <ActionButton secondary label={credits ? 'Recolher fontes' : 'Ver fontes e informações do texto'} onPress={() => setCredits(value => !value)} />
        {credits && <><Text style={ui.body}>{selected.rights.basis}</Text><Text style={ui.body}>{selected.rights.textNote}</Text>{selected.rights.sources.map(source => <ActionButton key={source.url} secondary label={source.label} onPress={() => { setError(''); void Linking.openURL(source.url).catch(() => setError('Não foi possível abrir a fonte. Confira sua conexão.')); }} />)}</>}
        {!!error && <Text accessibilityRole="alert" style={{ color: p.danger }}>{error}</Text>}
      </View>
    </>}
  </MinisterialScreen>;
}
