import { Text, View } from 'react-native';
import { FeatureLink, useUi } from './modern-ui';
import { ActionButton } from './ui-controls';
import { PlanProgressBar } from './plan-progress';
import { useReadingPlans } from '@/hooks/use-reading-plans';
import { getReadingPlan, planSummary } from '@/data/reading-plans';
import { useAppTheme } from './app-theme';

export function PlanResume() {
  const plans = useReadingPlans(); const ui = useUi(); const { palette: p } = useAppTheme();
  if (!plans.ready) return <Text style={ui.body}>Carregando seu plano…</Text>;
  if (plans.error) return <View style={ui.card}><Text accessibilityRole="alert" style={{ color: p.danger }}>{plans.error}</Text><ActionButton secondary label="Tentar recuperar plano" onPress={plans.retry} /></View>;
  const plan = plans.state.activePlanId ? getReadingPlan(plans.state.activePlanId) : undefined;
  if (!plan) return <FeatureLink title="Planos de leitura" description="Escolha uma jornada e siga no seu ritmo." icon="checkmark-circle-outline" href="/reading-plans" violet />;
  const progress = plans.state.plans.find(item => item.planId === plan.id)!;
  const summary = planSummary(plan, progress.completed);
  return <View style={ui.card}>
    <Text style={ui.eyebrow}>{summary.next ? 'SEU PLANO DE LEITURA' : 'PLANO CONCLUÍDO'}</Text>
    <Text style={ui.cardTitle}>{plan.title}</Text>
    <PlanProgressBar completed={summary.chaptersDone} total={summary.total} daysDone={summary.daysDone} days={plan.days.length} />
    <FeatureLink title={summary.next ? 'Continuar meu plano' : 'Ver plano concluído'} description={summary.next ? 'Dia ' + summary.next.day + ' • ' + summary.next.book + ' ' + summary.next.chapter : 'Sua jornada está registrada. Escolha seu próximo passo.'}
      icon={summary.next ? 'book-outline' : 'checkmark-circle-outline'} href={summary.next ? { pathname: '/chapter', params: { book: summary.next.book, chapter: summary.next.chapter, plan: plan.id, day: summary.next.day } } : { pathname: '/reading-plan', params: { plan: plan.id } }} />
  </View>;
}
