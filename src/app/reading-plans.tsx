import { Text, View } from 'react-native';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, useUi } from '@/components/modern-ui';
import { ActionButton } from '@/components/ui-controls';
import { useAppTheme } from '@/components/app-theme';
import { useReadingPlans } from '@/hooks/use-reading-plans';
import { readingPlans, planSummary } from '@/data/reading-plans';

export default function ReadingPlansScreen() {
  const plans = useReadingPlans(); const ui = useUi(); const { palette: p } = useAppTheme();
  return <MinisterialScreen title="Planos de leitura" backTo="/">
    <Text style={ui.body}>Escolha uma jornada e siga no seu ritmo. Você marca o que concluiu; abrir uma passagem não altera o progresso.</Text>
    {!plans.ready && <Text style={ui.body}>Carregando seus planos…</Text>}
    {!!plans.error && <View style={ui.card}><Text accessibilityRole="alert" style={{ color: p.danger }}>{plans.error}</Text><ActionButton secondary label="Tentar recuperar planos" onPress={plans.retry} /></View>}
    {readingPlans.map(plan => {
      const progress = plans.state.plans.find(item => item.planId === plan.id);
      const summary = planSummary(plan, progress?.completed ?? []);
      return <View key={plan.id} style={ui.card}>
        <Text style={ui.eyebrow}>{plan.days.length} DIAS • {plan.rhythm}</Text>
        <Text style={ui.heading}>{plan.title}</Text><Text style={ui.body}>{plan.description}</Text>
        {plans.ready && !plans.error && progress && <Text style={[ui.body, { color: p.accent }]}>{summary.next ? summary.daysDone + (summary.daysDone === 1 ? ' etapa concluída' : ' etapas concluídas') + (plans.state.activePlanId === plan.id ? ' • Plano ativo' : ' • Progresso salvo') : 'Plano concluído'}</Text>}
        <FeatureLink title={'Conhecer ' + plan.title} description="Veja as etapas e acompanhe sua leitura." icon="checkmark-circle-outline" href={{ pathname: '/reading-plan', params: { plan: plan.id } }} violet />
      </View>;
    })}
  </MinisterialScreen>;
}
