import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from './app-theme';
import { useUi } from './modern-ui';
import { useReaderPreferences } from './reader-preferences-provider';
import { readerDefaults, readerTypography, type ReaderPreferences } from '@/services/reader-preferences-repository';
import { ActionButton } from './ui-controls';
import { bibleTextProvider } from '@/data/bible-text';
const groups = [
  { key: 'size', title: 'Tamanho do texto', options: [{ value: 'standard', label: 'Padrão' }, { value: 'medium', label: 'Maior' }, { value: 'large', label: 'Grande' }] },
  { key: 'spacing', title: 'Espaçamento entre linhas', options: [{ value: 'standard', label: 'Regular' }, { value: 'wide', label: 'Amplo' }] },
  { key: 'layout', title: 'Organização dos versículos', options: [{ value: 'cards', label: 'Em cards' }, { value: 'continuous', label: 'Contínua' }] },
] as const;
export function ReaderOptions() {
  const state = useReaderPreferences(); const { palette: p } = useAppTheme(); const ui = useUi();
  const disabled = !state.ready || state.busy;
  const defaults = Object.keys(readerDefaults).every(key => state.preferences[key as keyof ReaderPreferences] === readerDefaults[key as keyof ReaderPreferences]);
  return <>
    {!state.ready && !state.error && <Text style={ui.body}>Carregando sua preferência de leitura…</Text>}
    {groups.map(group => <View key={group.key} style={{ gap: 10 }}>
      <Text style={ui.cardTitle}>{group.title}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={group.title} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {group.options.map(option => {
          const selected = state.preferences[group.key] === option.value;
          return <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} aria-checked={selected} accessibilityState={{ checked: selected, disabled }} disabled={disabled}
            onPress={() => { if (!selected) void state.update({ [group.key]: option.value }); }}
            style={({ pressed }) => ({ minHeight: 44, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: selected ? p.accent : p.border, backgroundColor: selected ? p.accentSurface : p.surface, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}>
            {selected && <Ionicons accessible={false} name="checkmark" size={15} color={p.accent} />}
            <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? p.accent : p.muted }}>{option.label}</Text>
          </Pressable>;
        })}
      </View>
    </View>)}
    <View style={[ui.card, state.preferences.layout === 'continuous' && { backgroundColor: 'transparent', borderColor: 'transparent', paddingHorizontal: 0 }]}>
      <Text style={ui.eyebrow}>PRÉVIA DA LEITURA</Text>
      <Text style={{ color: p.accent, fontSize: 12, fontWeight: '700' }}>Salmos 23:1</Text>
      <Text style={{ color: p.text, ...readerTypography(state.preferences) }}>{bibleTextProvider.getChapter('Salmos', 23)?.[0]}</Text>
    </View>
    {!!state.error && <View style={ui.card}><Text accessibilityRole="alert" style={{ color: p.danger, lineHeight: 22 }}>{state.error}</Text><ActionButton secondary label="Tentar recuperar preferências" disabled={state.busy} onPress={state.retry} /></View>}
    <Text accessibilityLiveRegion="polite" style={ui.body}>{state.busy ? 'Salvando sua escolha…' : state.ready ? 'Suas escolhas ficam salvas neste aparelho e acompanham os próximos capítulos.' : 'Sua leitura permanece disponível.'}</Text>
    <ActionButton secondary label="Restaurar leitura padrão" disabled={disabled || defaults} busy={state.busy} onPress={() => void state.update({ ...readerDefaults })} />
  </>;
}
