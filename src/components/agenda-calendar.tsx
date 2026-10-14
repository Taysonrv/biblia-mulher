import { useAppTheme } from '@/components/app-theme';
import type { Palette } from '@/constants/design';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { localDateKey, monthDays } from '@/services/agenda-model';
import { useMinisterialStyles } from './ministerial-screen';

type Props = { month: Date; selected: string; marked: Set<string>; onMonth: (date: Date) => void; onSelect: (date: Date) => void };
export function AgendaCalendar({ month, selected, marked, onMonth, onSelect }: Props) {
  const { palette: p } = useAppTheme();
  const styles = createStyles(p);
  const s = useMinisterialStyles();
  const days = monthDays(month);
  return <View style={s.card}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" style={s.back}
        onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}><Text style={s.backText}>‹</Text></Pressable>
      <Text accessibilityRole="header" style={styles.month}>{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" style={s.back}
        onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}><Text style={s.backText}>›</Text></Pressable>
    </View>
    <View style={styles.row}>
      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((name, i) => <Text key={i} style={styles.weekday}>{name}</Text>)}
    </View>
    {Array.from({ length: days.length / 7 }, (_, week) => <View key={week} style={styles.row}>
      {days.slice(week * 7, week * 7 + 7).map((day, index) => {
        if (!day) return <View key={'empty-' + index} style={styles.cell} />;
        const key = localDateKey(day);
        const isSelected = key === selected;
        const hasEvents = marked.has(key);
        return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: isSelected }}
          accessibilityLabel={day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + (hasEvents ? ', com compromissos' : '')}
          style={[styles.cell, isSelected && styles.selected]} onPress={() => onSelect(day)}>
          <Text style={[styles.day, isSelected && styles.selectedText]}>{day.getDate()}</Text>
          <View style={[styles.dot, { backgroundColor: hasEvents ? (isSelected ? p.ink : p.accent) : 'transparent' }]} />
        </Pressable>;
      })}
    </View>)}
    <Text style={styles.legend}>• Dias com compromissos</Text>
  </View>;
}
function createStyles(p: Palette) { return StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  month: { flex: 1, textAlign: 'center', color: p.text, fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: p.muted, fontWeight: '600' },
  cell: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, gap: 3 },
  selected: { backgroundColor: p.accent },
  day: { fontSize: 16, color: p.text },
  selectedText: { color: p.ink, fontWeight: '700' },
  dot: { height: 5, width: 5, borderRadius: 3 },
  legend: { color: p.muted, fontSize: 12 },
}); }
