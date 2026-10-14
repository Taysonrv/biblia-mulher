import { useRef, useState, type PropsWithChildren } from 'react';
import { Keyboard, Pressable, Text, TextInput, View, type ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { useUi } from '@/components/modern-ui';
import { useAppTheme } from '@/components/app-theme';
import { ActionButton } from '@/components/ui-controls';
import { useSavedSermons } from '@/hooks/use-saved-sermons';
import { savedSermons } from '@/services/saved-sermons';
import { SERMON_LIMITS as L, type SavedSermon } from '@/services/sermon-repository';

function Field({ label, value, maxLength, onChange }: { label: string; value: string; maxLength: number; onChange: (value: string) => void }) {
  const s = useMinisterialStyles(); const { palette: p } = useAppTheme();
  return <View style={{ gap: 8 }}><Text style={s.badge}>{label}</Text><TextInput accessibilityLabel={label} style={[s.input, { minHeight: maxLength <= 600 ? 80 : 130 }]} value={value} multiline maxLength={maxLength} placeholderTextColor={p.subtle} onChangeText={onChange} /><Text style={s.body}>{value.length}/{maxLength}</Text></View>;
}
function EditorSection({ title, children }: PropsWithChildren<{ title: string }>) {
  const [open, setOpen] = useState(false); const ui = useUi();
  return <View style={ui.card}><Pressable accessibilityRole="button" accessibilityLabel={'Editar ' + title} accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={{ minHeight: 44, justifyContent: 'center', gap: 4 }}><Text style={ui.cardTitle}>{title} {open ? '−' : '+'}</Text><Text style={ui.body}>{open ? 'Toque para recolher' : 'Toque para adaptar esta parte'}</Text></Pressable>{open && children}</View>;
}
type Draft = { record: SavedSermon; references: string; questions: string };
function EditorForm({ initial }: { initial: SavedSermon }) {
  const s = useMinisterialStyles(); const ui = useUi(); const id = initial.id; const scroll = useRef<ScrollView>(null);
  const [draft, setDraft] = useState<Draft>({ record: initial, references: initial.outline.references.join('\n'), questions: initial.outline.questions.join('\n') }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const locked = useRef(false);
  function change(field: 'theme' | 'baseText' | 'introduction' | 'application' | 'conclusion', value: string) {
    setDraft(previous => previous && ({ ...previous, record: { ...previous.record, outline: { ...previous.record.outline, [field]: value } } })); setError('');
  }
  function point(index: number, field: 'title' | 'body', value: string) {
    setDraft(previous => previous && ({ ...previous, record: { ...previous.record, outline: { ...previous.record.outline, points: previous.record.outline.points.map((item, current) => current === index ? { ...item, [field]: value } : item) } } })); setError('');
  }
  async function save() {
    if (!draft || locked.current) return;
    locked.current = true; setBusy(true); setError(''); Keyboard.dismiss();
    try {
      const lines = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean);
      const outline = { ...draft.record.outline, references: lines(draft.references), questions: lines(draft.questions) };
      const updated = await savedSermons.save(id, outline, draft.record.notes, draft.record.updatedAt);
      setDraft({ record: updated, references: updated.outline.references.join('\n'), questions: updated.outline.questions.join('\n') });
      router.replace({ pathname: '/sermon-outline', params: { id } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu texto continua no editor.'); scroll.current?.scrollTo({ y: 0, animated: true }); }
    finally { locked.current = false; setBusy(false); }
  }
  return <MinisterialScreen title="Editar mensagem" backTo={{ pathname: '/sermon-outline', params: { id } }} preferBackTo scrollRef={scroll}>
    <Text style={ui.body}>Adapte o roteiro à sua comunidade. As alterações são guardadas ao tocar em “Salvar alterações”.</Text>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {draft && <>
      <View style={ui.card}><Field label="Tema da mensagem" value={draft.record.outline.theme} maxLength={L.theme} onChange={value => change('theme', value)} /><Field label="Texto-base da mensagem" value={draft.record.outline.baseText} maxLength={L.baseText} onChange={value => change('baseText', value)} /></View>
      <ActionButton label="Salvar alterações" busy={busy} onPress={() => void save()} />
      <EditorSection title="Introdução"><Field label="Introdução da mensagem" value={draft.record.outline.introduction} maxLength={L.body} onChange={value => change('introduction', value)} /></EditorSection>
      {draft.record.outline.points.map((item, index) => <EditorSection key={index} title={`Ponto ${index + 1}`}><Field label={`Título do ponto ${index + 1}`} value={item.title} maxLength={L.pointTitle} onChange={value => point(index, 'title', value)} /><Field label={`Desenvolvimento do ponto ${index + 1}`} value={item.body} maxLength={L.body} onChange={value => point(index, 'body', value)} /></EditorSection>)}
      <EditorSection title="Aplicação"><Field label="Aplicação da mensagem" value={draft.record.outline.application} maxLength={L.body} onChange={value => change('application', value)} /></EditorSection>
      <EditorSection title="Conclusão"><Field label="Conclusão da mensagem" value={draft.record.outline.conclusion} maxLength={L.body} onChange={value => change('conclusion', value)} /></EditorSection>
      <EditorSection title="Referências relacionadas"><Text style={ui.body}>Uma referência por linha, até {L.list} referências. Confira cada passagem na Bíblia.</Text><Field label="Referências da mensagem" value={draft.references} maxLength={L.reference * L.list} onChange={value => { setDraft(previous => previous && ({ ...previous, references: value })); setError(''); }} /></EditorSection>
      <EditorSection title="Perguntas para reflexão"><Text style={ui.body}>Uma pergunta por linha, até {L.list} perguntas.</Text><Field label="Perguntas da mensagem" value={draft.questions} maxLength={L.question * L.list} onChange={value => { setDraft(previous => previous && ({ ...previous, questions: value })); setError(''); }} /></EditorSection>
      <EditorSection title="Minhas notas pessoais"><Text style={ui.body}>Acrescente exemplos, ideias e lembretes para sua preparação. Estas notas ficam fora do compartilhamento, a menos que você escolha incluí-las.</Text><Field label="Notas pessoais da mensagem" value={draft.record.notes} maxLength={L.notes} onChange={value => { setDraft(previous => previous && ({ ...previous, record: { ...previous.record, notes: value } })); setError(''); }} /></EditorSection>
      <ActionButton label="Concluir edição e salvar" busy={busy} onPress={() => void save()} />
    </>}
  </MinisterialScreen>;
}
function EditorContent({ id }: { id: string }) {
  const s = useMinisterialStyles(); const library = useSavedSermons(); const saved = library.entries.find(entry => entry.id === id);
  if (library.ready && saved) return <EditorForm key={saved.id + ':' + saved.updatedAt} initial={saved} />;
  return <MinisterialScreen title="Editar mensagem" backTo="/sermons" preferBackTo>
    {!!library.error ? <><Text accessibilityRole="alert" style={s.error}>{library.error}</Text><ActionButton secondary label="Tentar carregar editor" onPress={library.retry} /></> : <Text style={s.body}>{library.ready ? 'Este esboço não foi encontrado. Volte à sua coleção.' : 'Carregando sua mensagem…'}</Text>}
  </MinisterialScreen>;
}
export default function SermonEditorScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>(); const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? '';
  return <EditorContent key={id} id={id} />;
}
