import { useState, type PropsWithChildren } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { useAppTheme } from './app-theme';
import { useUi } from './modern-ui';
export function StudySection({ title, children }: PropsWithChildren<{ title: string }>) {
  const ui = useUi();
  return <View style={ui.card}><Text accessibilityRole="header" style={ui.heading}>{title}</Text>{children}</View>;
}
export { SearchField as StudySearch, FilterChips as StudyFilters } from './ui-controls';
export function StudySourceLink({ label, url }: { label: string; url: string }) {
  const ui = useUi(); const { palette: p } = useAppTheme(); const [error, setError] = useState('');
  async function open() { try { await Linking.openURL(url); setError(''); } catch { setError('Não foi possível abrir a fonte. Tente novamente.'); } }
  return <View style={{ gap: 6 }}><Pressable accessibilityRole="link" accessibilityLabel={'Abrir fonte externa: ' + label} onPress={() => void open()} style={{ minHeight: 44, justifyContent: 'center' }}>
    <Text style={[ui.body, { color: p.accent, textDecorationLine: 'underline' }]}>{label} ↗</Text>
  </Pressable>{!!error && <Text accessibilityRole="alert" style={{ color: p.danger }}>{error}</Text>}</View>;
}
