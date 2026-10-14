import { Text, View } from 'react-native';
import { useAppTheme } from './app-theme';
import { useUi } from './modern-ui';
export function PlanProgressBar({ completed, total, daysDone, days }: { completed: number; total: number; daysDone: number; days: number }) {
  const { palette: p } = useAppTheme(); const ui = useUi();
  const percent = Math.floor(completed * 100 / total);
  return <View style={{ gap: 8 }}>
    <Text style={ui.body}>{completed} de {total} capítulos • {daysDone} de {days} etapas concluídas</Text>
    <View accessibilityRole="progressbar" accessibilityLabel="Progresso do plano" accessibilityValue={{ min: 0, max: total, now: completed, text: percent + '%' }}
      style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: p.border }}>
      <View style={{ height: 8, width: `${completed * 100 / total}%`, backgroundColor: p.accent, borderRadius: 4 }} />
    </View>
  </View>;
}
