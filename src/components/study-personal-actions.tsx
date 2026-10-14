import { Text, View } from 'react-native';
import { FeatureLink, useUi } from './modern-ui';
import { ActionButton } from './ui-controls';
import { useAppTheme } from './app-theme';
import { usePersonalStudies } from '@/hooks/use-personal-studies';
import type { StudyKind } from '@/services/personal-studies-repository';

export function StudyPersonalActions({ kind, studyId, fromStudySearch, fromMyStudies }: {
  kind: StudyKind; studyId: string; fromStudySearch?: string; fromMyStudies?: string;
}) {
  const ui = useUi(); const { palette: p } = useAppTheme(); const state = usePersonalStudies();
  const entry = state.entries.find(row => row.kind === kind && row.studyId === studyId);
  return <View style={ui.card}>
    <Text style={ui.eyebrow}>SEU ESTUDO</Text>
    <Text style={ui.heading}>{entry?.saved ? 'Guardado para revisitar.' : 'Leve esta descoberta com você.'}</Text>
    <Text style={ui.body}>Guarde o estudo e registre o que você aprendeu. Tudo fica neste aparelho e pode ser incluído no seu backup.</Text>
    <ActionButton secondary label={entry?.saved ? 'Remover dos estudos salvos' : 'Salvar em Meus estudos'} disabled={!state.ready || state.busy}
      busy={state.busy} onPress={() => void state.setSaved(kind, studyId, !entry?.saved)} />
    {entry?.saved && <Text accessibilityLiveRegion="polite" style={[ui.body, { color: p.accent }]}>Salvo em Meus estudos.</Text>}
    {!!entry?.note && <View style={{ gap: 6 }}><Text style={ui.cardTitle}>Minha reflexão</Text><Text selectable style={ui.body}>{entry.note.length > 240 ? entry.note.slice(0, 240) + '…' : entry.note}</Text></View>}
    {state.ready && <FeatureLink title={entry?.note ? 'Editar minha reflexão' : 'Escrever minha reflexão'} description="Suas palavras, suas perguntas e seus aprendizados." icon="create-outline"
      href={{ pathname: '/study-note', params: { kind, studyId, ...(fromStudySearch === '1' ? { fromStudySearch: '1' } : {}), ...(fromMyStudies === '1' ? { fromMyStudies: '1' } : {}) } }} />}
    {!!state.error && <><Text accessibilityRole="alert" style={{ color: p.danger, lineHeight: 23 }}>{state.error}</Text><ActionButton secondary label="Tentar carregar meus estudos" disabled={state.busy} onPress={state.retry} /></>}
  </View>;
}
