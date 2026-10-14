import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { FeatureLink, useUi } from './modern-ui';
import { ActionButton } from './ui-controls';
import { useAppTheme } from './app-theme';
import { useReadingPlans } from '@/hooks/use-reading-plans';
import { getReadingPlan, planChapterKey, planContains, planSummary } from '@/data/reading-plans';

export function ChapterPlanProgress({ id, day, book, chapter }: { id: string; day: number; book: string; chapter: number }) {
  const plans = useReadingPlans(); const ui = useUi(); const { palette: p } = useAppTheme();
  const plan = getReadingPlan(id);
  if (!plan || !planContains(id, day, book, chapter)) return <View style={ui.card}><Text style={ui.body}>Este capítulo não corresponde à etapa do plano informado.</Text><FeatureLink title="Escolher plano de leitura" description="Confira as etapas disponíveis." icon="checkmark-circle-outline" href="/reading-plans" /></View>;
  const progress = plans.state.plans.find(item => item.planId === id);
  const done = !!progress?.completed.includes(planChapterKey(day, book, chapter));
  const summary = planSummary(plan, progress?.completed ?? []);
  return <View style={ui.card}>
    <Text style={ui.eyebrow}>{plan.title} • Dia {day}</Text>
    <Text style={ui.cardTitle}>{done ? 'Leitura concluída' : 'Concluiu este capítulo?'}</Text>
    <Text style={ui.body}>Marque após ler. O progresso é salvo neste aparelho.</Text>
    {!plans.ready && <Text style={ui.body}>Carregando progresso…</Text>}
    {!!plans.error && <><Text accessibilityRole="alert" style={{ color: p.danger }}>{plans.error}</Text><ActionButton secondary label="Tentar recuperar progresso" onPress={plans.retry} /></>}
    {progress && <ActionButton label={done ? 'Marcar capítulo como pendente' : 'Concluir capítulo no plano'} secondary={done} disabled={!plans.ready} busy={plans.busy} onPress={() => void plans.complete(id, day, book, chapter, !done)} />}
    {progress && done && summary.next && <ActionButton secondary label="Próxima leitura do plano" onPress={() => { const next = summary.next!; router.replace({ pathname: '/chapter', params: { ...next, plan: id } }); }} />}
    {progress && !summary.next && <Text style={ui.heading}>Plano concluído! Seu progresso está salvo.</Text>}
    <FeatureLink title={progress ? 'Ver meu plano' : 'Começar este plano'} description="Confira as etapas e seu progresso." icon="checkmark-circle-outline" href={{ pathname: '/reading-plan', params: { plan: id } }} />
  </View>;
}
