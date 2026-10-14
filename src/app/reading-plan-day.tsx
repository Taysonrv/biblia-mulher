import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, useUi } from '@/components/modern-ui';
import { ActionButton } from '@/components/ui-controls';
import { useAppTheme } from '@/components/app-theme';
import { useReadingPlans } from '@/hooks/use-reading-plans';
import { getReadingPlan, getPlanDay, planChapterKey } from '@/data/reading-plans';

export default function ReadingPlanDayScreen() {
  const params = useLocalSearchParams<{ plan?: string; day?: string }>();
  const id = typeof params.plan === 'string' ? params.plan : ''; const number = Number(params.day);
  const plan = getReadingPlan(id); const day = getPlanDay(id, number);
  const plans = useReadingPlans(); const ui = useUi(); const { palette: p } = useAppTheme();
  const progress = plans.state.plans.find(item => item.planId === id);
  return <MinisterialScreen key={id + ':' + number} title={day ? 'Dia ' + day.day : 'Etapa não encontrada'} backTo={plan ? { pathname: '/reading-plan', params: { plan: id } } : '/reading-plans'}>
    {!day || !plan ? <FeatureLink title="Escolher um plano" description="Confira as jornadas disponíveis." icon="checkmark-circle-outline" href="/reading-plans" /> : <>
      <Text style={ui.eyebrow}>{plan.title}</Text><Text style={ui.heading}>{day.title}</Text>
      <Text style={ui.body}>Leia cada capítulo. Ao terminar, use “Concluir capítulo no plano” no final da leitura. Uma etapa é concluída quando todas as suas passagens estão marcadas.</Text>
      {!plans.ready && <Text style={ui.body}>Carregando progresso…</Text>}
      {!!plans.error && <View style={ui.card}><Text accessibilityRole="alert" style={{ color: p.danger }}>{plans.error}</Text><ActionButton secondary label="Tentar recuperar progresso" onPress={plans.retry} /></View>}
      {plans.ready && !plans.error && !progress && <View style={ui.card}><Text style={ui.body}>Comece o plano para salvar o progresso destas leituras.</Text><ActionButton label="Começar este plano" busy={plans.busy} onPress={() => void plans.activate(id)} /></View>}
      {day.readings.map(reading => <FeatureLink key={reading.book + ':' + reading.chapter} title={reading.book + ' ' + reading.chapter}
        description={plans.ready && !plans.error && progress?.completed.includes(planChapterKey(day.day, reading.book, reading.chapter)) ? 'Concluído • Toque para reler' : 'Abrir capítulo'} icon="book-outline"
        href={{ pathname: '/chapter', params: { ...reading, plan: id, day: day.day } }} />)}
      <FeatureLink title="Ver todas as etapas" description="Acompanhe o progresso completo deste plano." icon="checkmark-circle-outline" href={{ pathname: '/reading-plan', params: { plan: id } }} />
    </>}
  </MinisterialScreen>;
}
