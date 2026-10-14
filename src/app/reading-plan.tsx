import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, useUi } from '@/components/modern-ui';
import { ActionButton } from '@/components/ui-controls';
import { PlanProgressBar } from '@/components/plan-progress';
import { useAppTheme } from '@/components/app-theme';
import { useReadingPlans } from '@/hooks/use-reading-plans';
import { getReadingPlan, planChapterKey, planSummary } from '@/data/reading-plans';

const PAGE_SIZE = 14;
export default function ReadingPlanScreen() {
  const params = useLocalSearchParams<{ plan?: string }>();
  const id = typeof params.plan === 'string' ? params.plan : '';
  const plan = getReadingPlan(id); const plans = useReadingPlans(); const ui = useUi(); const { palette: p } = useAppTheme();
  const [selection, setSelection] = useState<{ id: string; page: number } | null>(null);
  const progress = plans.state.plans.find(item => item.planId === id);
  const summary = plan ? planSummary(plan, progress?.completed ?? []) : null;
  const page = selection?.id === id ? selection.page : Math.floor(((summary?.next?.day ?? 1) - 1) / PAGE_SIZE);
  return <MinisterialScreen key={id + ':' + page} title={plan?.title ?? 'Plano não encontrado'} backTo="/reading-plans">
    {!plan || !summary ? <FeatureLink title="Escolher um plano" description="Conheça as jornadas disponíveis." icon="checkmark-circle-outline" href="/reading-plans" /> : <>
      <Text style={ui.body}>{plan.description}</Text>
      <Text style={ui.body}>{plan.rhythm}. Os dias são etapas: você pode avançar quando desejar, sem perder progresso.</Text>
      {!plans.ready ? <Text style={ui.body}>Carregando progresso…</Text> : plans.error ? <View style={ui.card}><Text accessibilityRole="alert" style={{ color: p.danger }}>{plans.error}</Text><ActionButton secondary label="Tentar recuperar progresso" onPress={plans.retry} /></View> : <>
        <View style={ui.card}>
          <Text style={ui.eyebrow}>{summary.next ? (plans.state.activePlanId === id ? 'PLANO ATIVO' : progress ? 'PROGRESSO SALVO' : 'SUA PRÓXIMA JORNADA') : 'PLANO CONCLUÍDO'}</Text>
          <PlanProgressBar completed={summary.chaptersDone} total={summary.total} daysDone={summary.daysDone} days={plan.days.length} />
          {plans.state.activePlanId !== id && <ActionButton label={progress ? 'Retomar este plano' : 'Começar este plano'} busy={plans.busy} onPress={() => void plans.activate(id)} />}
          {progress && summary.next && <ActionButton label="Continuar plano" disabled={plans.busy} onPress={() => { const next = summary.next!; router.push({ pathname: '/chapter', params: { ...next, plan: id } }); }} />}
          {progress && !summary.next && <Text style={ui.heading}>Você concluiu todas as etapas! Sua jornada está salva.</Text>}
          {plans.state.activePlanId === id && <ActionButton secondary label="Pausar plano" busy={plans.busy} onPress={() => void plans.pause(id)} />}
          <Text style={ui.body}>Trocar de plano ou pausar preserva as leituras concluídas.</Text>
        </View>
        <Text style={ui.heading}>Etapas de leitura</Text>
        <Text style={ui.body}>Etapas {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, plan.days.length)} de {plan.days.length}. Toque para ver as passagens.</Text>
        {plan.days.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(day => {
          const done = day.readings.filter(item => progress?.completed.includes(planChapterKey(day.day, item.book, item.chapter))).length;
          const complete = done === day.readings.length;
          const status = done + ' de ' + day.readings.length + (day.readings.length === 1 ? ' capítulo concluído' : ' capítulos concluídos');
          return <Pressable key={day.day} accessibilityRole="button" accessibilityLabel={'Dia ' + day.day + '. ' + day.title + '. ' + (complete ? 'Concluído' : status)}
            onPress={() => router.push({ pathname: '/reading-plan-day', params: { plan: id, day: day.day } })}
            style={({ pressed }) => [ui.card, complete && { borderColor: p.accent, backgroundColor: p.accentSurface }, pressed && ui.pressed]}>
            <Text style={ui.eyebrow}>DIA {day.day}{complete ? ' • CONCLUÍDO' : ''}</Text>
            <Text style={ui.cardTitle}>{day.title}</Text>
            <Text style={ui.body}>{day.readings.map(item => item.book + ' ' + item.chapter).join(' • ')}</Text>
            {!complete && <Text style={ui.body}>{status}</Text>}
          </Pressable>;
        })}
        <View style={{ gap: 10, flexDirection: 'row', flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 120 }}><ActionButton secondary label="Etapas anteriores" disabled={page === 0} onPress={() => setSelection({ id, page: page - 1 })} /></View>
          <View style={{ flex: 1, minWidth: 120 }}><ActionButton secondary label="Próximas etapas" disabled={(page + 1) * PAGE_SIZE >= plan.days.length} onPress={() => setSelection({ id, page: page + 1 })} /></View>
        </View>
      </>}
      <FeatureLink title="Explorar outros planos" description="Seus avanços continuam salvos ao trocar de jornada." icon="layers-outline" href="/reading-plans" />
    </>}
  </MinisterialScreen>;
}
