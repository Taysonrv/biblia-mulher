import { useAppTheme } from '@/components/app-theme';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { FeatureLink, useUi } from '@/components/modern-ui';
import { ActionButton } from '@/components/ui-controls';
import { useSavedSermons } from '@/hooks/use-saved-sermons';
import { normalizeSermonInput, sermonProvider, type SermonOutline } from '@/services/sermon';
import { formatSermon } from '@/services/sermon-repository';
import { savedSermons } from '@/services/saved-sermons';
import { shareSermon } from '@/services/sermon-sharing';
import { SermonManagement } from '@/components/sermon-management';
import { PremiumBoundary } from '@/components/premium-access';

function Section({ title, body }: { title: string; body: string }) {
  const s = useMinisterialStyles();
  return <View style={s.card}><Text style={s.heading}>{title}</Text><Text selectable style={s.body}>{body}</Text></View>;
}
function OutlineContent({ id, topic }: { id: string; topic: string }) {
  const { palette: p } = useAppTheme(); const s = useMinisterialStyles(); const ui = useUi(); const library = useSavedSermons();
  const [generated, setGenerated] = useState<SermonOutline | null>(null); const [generationError, setGenerationError] = useState('');
  const [actionError, setActionError] = useState(''); const [busy, setBusy] = useState(''); const locked = useRef(false);
  const [includeNotes, setIncludeNotes] = useState(false); const [shareText, setShareText] = useState(''); const [message, setMessage] = useState('');
  useEffect(() => {
    if (id) return;
    let active = true;
    sermonProvider.generate(topic).then(outline => { if (active) setGenerated(outline); }, () => { if (active) setGenerationError('Não foi possível criar o esboço. Volte e informe um tema ou passagem.'); });
    return () => { active = false; };
  }, [id, topic]);
  const saved = id ? library.entries.find(entry => entry.id === id) : undefined;
  const outline = id ? (library.ready ? saved?.outline : undefined) : generated;
  const error = id ? library.error || (library.ready && !saved ? 'Este esboço não foi encontrado. Volte à sua coleção.' : '') : generationError;
  async function action(kind: string, operation: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(kind); setActionError(''); setMessage('');
    try { await operation(); } catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Não foi possível concluir. Tente novamente.'); }
    finally { locked.current = false; setBusy(''); }
  }
  async function save() {
    if (!outline || id) return;
    const next = await savedSermons.create(topic, outline);
    router.replace({ pathname: '/sermon-outline', params: { id: next.id } });
  }
  async function share() {
    if (!outline) return;
    const text = formatSermon(outline, saved?.notes ?? '', includeNotes);
    const result = await shareSermon(text, outline.theme);
    if (result === 'text') { setShareText(text); setMessage('Selecione e copie o texto abaixo para compartilhar.'); }
    else { setShareText(''); if (result === 'opened') setMessage('Menu de compartilhamento aberto. Escolha o destino para concluir.'); }
  }
  return <MinisterialScreen title={id ? 'Minha mensagem' : 'Esboço de apoio'} backTo={id ? '/sermons' : '/sermon-builder'} preferBackTo={!!id}>
    {!outline && !error ? <ActivityIndicator accessibilityLabel="Preparando esboço" size="large" color={p.accent} /> : null}
    {!!error && <View style={ui.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text>{id && !!library.error && <ActionButton secondary label="Tentar abrir esboço" onPress={library.retry} />}</View>}
    {outline && <>
      <View style={[s.card, { backgroundColor: p.accentSurface }]}>
        <Text style={s.badge}>{saved ? 'SALVO NESTE APARELHO' : 'SUA MENSAGEM COMEÇA AQUI'}</Text><Text selectable style={s.heading}>{outline.theme}</Text>
        <Text style={s.badge}>TEXTO-BASE</Text><Text selectable style={s.body}>{outline.baseText}</Text>
        {saved && <Text style={ui.body}>Última edição: {new Date(saved.updatedAt).toLocaleString('pt-BR')}</Text>}
      </View>
      {!id ? <ActionButton label="Salvar esboço" busy={busy === 'save'} disabled={!!busy} onPress={() => void action('save', save)} />
        : <FeatureLink title="Editar minha mensagem" description="Adapte os pontos e acrescente suas notas." icon="create-outline" href={{ pathname: '/sermon-editor', params: { id } }} violet />}
      {!!saved && <FeatureLink title="Apresentar mensagem" description="Acompanhe os pontos com texto maior e navegação por seção." icon="play-circle-outline" href={{ pathname: '/sermon-presenter', params: { id } }} />}
      <ActionButton secondary label="Compartilhar esboço" busy={busy === 'share'} disabled={!!busy} onPress={() => void action('share', share)} />
      <ActionButton secondary label={shareText ? 'Ocultar texto para copiar' : 'Ver texto para copiar'} disabled={!!busy} onPress={() => { setShareText(shareText ? '' : formatSermon(outline, saved?.notes ?? '', includeNotes)); setMessage(''); }} />
      {!!saved?.notes && <View style={ui.card}><Text style={ui.body}>{includeNotes ? 'Suas notas pessoais serão incluídas no compartilhamento.' : 'Suas notas pessoais ficam fora do compartilhamento.'}</Text><ActionButton secondary label={includeNotes ? 'Retirar notas do compartilhamento' : 'Incluir notas no compartilhamento'} disabled={!!busy} onPress={() => { setIncludeNotes(value => !value); setShareText(''); }} /></View>}
      {!!actionError && <Text accessibilityRole="alert" style={s.error}>{actionError}</Text>}
      {!!message && <Text accessibilityLiveRegion="polite" style={ui.body}>{message}</Text>}
      {!!shareText && shareText === formatSermon(outline, saved?.notes ?? '', includeNotes) && <Section title="Texto para compartilhar" body={shareText} />}
      {!!saved && <SermonManagement key={`${saved.id}:${saved.updatedAt}`} message={saved} entries={library.entries} />}
      <Text style={s.body}>Roteiro inicial de apoio. Confira as referências na sua Bíblia e adapte os exemplos antes de pregar.</Text>
      <Section title="Introdução" body={outline.introduction} /><Text style={s.heading}>Desenvolvimento</Text>
      {outline.points.map((point, index) => <Section key={index} title={point.title} body={point.body} />)}
      <Section title="Aplicação" body={outline.application} /><Section title="Conclusão" body={outline.conclusion} />
      <View style={s.card}><Text style={s.heading}>Referências relacionadas</Text>{outline.references.map((ref, index) => <Text selectable key={index} style={s.body}>• {ref}</Text>)}</View>
      <View style={s.card}><Text style={s.heading}>Perguntas para reflexão</Text>{outline.questions.map((question, index) => <Text selectable key={index} style={s.body}>{index + 1}. {question}</Text>)}</View>
      {!!saved?.notes && <Section title="Minhas notas pessoais" body={saved.notes} />}
    </>}
    <FeatureLink title="Meus esboços" description="Retome suas mensagens salvas." icon="documents-outline" href="/sermons" />
    <ActionButton secondary label={id ? 'Preparar outra mensagem' : 'Revisar tema ou criar outro esboço'} disabled={!!busy} onPress={() => router.push({ pathname: '/sermon-builder', params: id ? {} : { topic } })} />
  </MinisterialScreen>;
}
export default function SermonOutlineScreen() {
  const params = useLocalSearchParams<{ topic?: string | string[]; id?: string | string[] }>();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? '';
  const topic = normalizeSermonInput((Array.isArray(params.topic) ? params.topic[0] : params.topic) ?? '');
  const content = <OutlineContent key={id || topic} id={id} topic={topic} />;
  return id ? content : <PremiumBoundary feature="ministerial" backTo="/support">{content}</PremiumBoundary>;
}
