import { View } from 'react-native';
import { router } from 'expo-router';
import { adjacentChapter, type ChapterReference } from '@/data/bible-catalog';
import { adjacentPlanReading, planContains } from '@/data/reading-plans';
import { ActionButton } from './ui-controls';

export function ChapterNavigation({ book, chapter, planId, day = 0 }: { book: string; chapter: number; planId?: string; day?: number }) {
  const inPlan = !!planId && planContains(planId, day, book, chapter);
  const previous = inPlan ? adjacentPlanReading(planId!, day, book, chapter, -1) : adjacentChapter(book, chapter, -1);
  const next = inPlan ? adjacentPlanReading(planId!, day, book, chapter, 1) : adjacentChapter(book, chapter, 1);
  function open(reference: (ChapterReference & { day?: number }) | null) {
    if (reference) router.replace({ pathname: '/chapter', params: { ...reference, ...(inPlan ? { plan: planId } : {}) } });
  }
  function label(reference: ChapterReference & { day?: number }) { return (inPlan ? 'Dia ' + reference.day + ' • ' : '') + reference.book + ' ' + reference.chapter; }
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
    <View style={{ flex: 1, minWidth: 120 }}><ActionButton secondary disabled={!previous} label={previous ? '‹ ' + label(previous) : inPlan ? 'Início do plano' : 'Início da Bíblia'} onPress={() => open(previous)} /></View>
    <View style={{ flex: 1, minWidth: 120 }}><ActionButton secondary disabled={!next} label={next ? label(next) + ' ›' : inPlan ? 'Fim do plano' : 'Fim da Bíblia'} onPress={() => open(next)} /></View>
  </View>;
}
