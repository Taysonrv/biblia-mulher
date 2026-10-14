import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from './app-theme';
import { useUi } from './modern-ui';

export function SearchField({ value, onChange, label, placeholder, onSubmit, maxLength }: {
  value: string; onChange: (value: string) => void; label: string; placeholder: string; onSubmit?: () => void; maxLength?: number;
}) {
  const { palette: p } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);
  return <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: 16,
    borderWidth: 1, borderColor: focused ? p.accent : p.border, backgroundColor: p.surface, paddingLeft: 14 }}>
    <Ionicons accessible={false} name="search-outline" size={20} color={p.accent} />
    <TextInput ref={input} accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={p.subtle}
      value={value} maxLength={maxLength} onChangeText={onChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={() => { input.current?.blur(); onSubmit?.(); }}
      style={{ flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 12, paddingVertical: 12, color: p.text, fontSize: 16 }} />
    {!!value && <Pressable accessibilityRole="button" accessibilityLabel={'Limpar busca: ' + label}
      onPress={() => { onChange(''); input.current?.focus(); }}
      style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Ionicons accessible={false} name="close-circle" size={21} color={p.muted} />
    </Pressable>}
  </View>;
}

export function FilterChips({ values, selected, onSelect, label = 'Filtros' }: {
  values: readonly string[]; selected: string; onSelect: (value: string) => void; label?: string;
}) {
  const { palette: p } = useAppTheme();
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
    {values.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={value} aria-checked={selected === value}
      accessibilityState={{ checked: selected === value }} onPress={() => onSelect(value)}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
        borderWidth: 1, borderColor: selected === value ? p.accent : p.border,
        backgroundColor: selected === value ? p.accentSurface : p.surface,
        flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}>
      {selected === value && <Ionicons accessible={false} name="checkmark" size={15} color={p.accent} />}
      <Text style={{ color: selected === value ? p.accent : p.muted, fontSize: 14, fontWeight: '600' }}>{value}</Text>
    </Pressable>)}
  </View>;
}

export function ActionButton({ label, onPress, secondary = false, disabled = false, busy = false }: {
  label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; busy?: boolean;
}) {
  const ui = useUi(); const { palette: p } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [ui.button, secondary && { backgroundColor: p.surfaceRaised, borderWidth: 1, borderColor: p.border },
      (disabled || busy) && { opacity: 0.5 }, pressed && ui.pressed]}>
    {busy && <ActivityIndicator size="small" color={secondary ? p.accent : p.ink} />}
    <Text style={[ui.buttonText, secondary && { color: p.accent }]}>{label}</Text>
  </Pressable>;
}
