import { useRef, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { useUi } from '@/components/modern-ui';
import { ActionButton } from '@/components/ui-controls';
import { useSavedSermons } from '@/hooks/use-saved-sermons';
import { savedSermons } from '@/services/saved-sermons';
import { SERMON_LIMITS, type SavedSermon } from '@/services/sermon-repository';
import type { SermonOutline } from '@/services/sermon';

function ManuscriptForm({ initial }: { initial?: SavedSermon }) {
  const s = useMinisterialStyles(); const ui = useUi();
  const [title, setTitle] = useState(initial?.outline.theme ?? '');
  const [base, setBase] = useState(initial?.outline.baseText ?? '');
  const [body, setBody] = useState(initial?.outline.manuscript ?? '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const locked = useRef(false);
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const invalid = !title.trim() || !body.trim() || title.length > SERMON_LIMITS.theme || base.length > SERMON_LIMITS.baseText || body.length > SERMON_LIMITS.manuscript;
  async function save() {
    if (locked.current || invalid) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const outline: SermonOutline = { theme: title.trim(), baseText: base.trim(), manuscript: body,
        introduction: '', points: [], application: '', conclusion: '', references: [], questions: [] };
      const result = initial ? await savedSermons.save(initial.id, outline, initial.notes, initial.updatedAt) : await savedSermons.create(title.trim(), outline);
      router.replace({ pathname: '/sermon-outline', params: { id: result.id } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Seu texto continua aqui.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <MinisterialScreen title={initial ? 'Editar pregação completa' : 'Colar pregação completa'} backTo={initial ? { pathname: '/sermon-outline', params: { id: initial.id } } : '/sermons'}>
    <Text style={ui.body}>Cole o texto criado no AI Studio ou escrito por você. Todos os pontos, parágrafos e a oração ficam preservados, sem limitar a três pontos. Este recurso não chama a IA e não exige assinatura.</Text>
    <Text style={ui.cardTitle}>Título da pregação</Text>
    <TextInput accessibilityLabel="Título da pregação completa" editable={!busy} value={title} onChangeText={setTitle} style={[s.input, { minHeight: 70 }]} multiline />
    <Text style={ui.cardTitle}>Passagem bíblica (opcional)</Text>
    <TextInput accessibilityLabel="Passagem da pregação completa" editable={!busy} value={base} onChangeText={setBase} style={[s.input, { minHeight: 60 }]} />
    <Text style={ui.cardTitle}>Texto completo</Text>
    <TextInput accessibilityLabel="Texto completo da pregação" editable={!busy} value={body} onChangeText={setBody} style={[s.input, { minHeight: 320 }]} multiline />
    <Text accessibilityLiveRegion="polite" style={ui.body}>{body.length}/{SERMON_LIMITS.manuscript} caracteres · {words} palavras · cerca de {Math.max(1, Math.ceil(words / 140))}–{Math.max(1, Math.ceil(words / 100))} minutos de leitura. Pausas e interação alteram o tempo real.</Text>
    {(title.length > SERMON_LIMITS.theme || base.length > SERMON_LIMITS.baseText || body.length > SERMON_LIMITS.manuscript) && <Text style={s.error}>Use até {SERMON_LIMITS.theme} caracteres no título, {SERMON_LIMITS.baseText} na passagem e {SERMON_LIMITS.manuscript} no texto. Nada foi cortado: reduza o conteúdo antes de salvar.</Text>}
    <Text style={ui.body}>Confira citações, referências e exemplos antes de pregar. Ao salvar, abra Apresentar mensagem → Tela cheia para ler no tablet. O texto só é guardado ao tocar em Salvar.</Text>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <ActionButton label={initial ? 'Salvar alterações da pregação' : 'Salvar pregação completa'} disabled={busy || invalid} busy={busy} onPress={() => void save()} />
  </MinisterialScreen>;
}
export default function SermonManuscriptScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>(); const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? '';
  const library = useSavedSermons(); const ui = useUi();
  if (!id) return <ManuscriptForm />;
  const record = library.entries.find(item => item.id === id);
  if (library.ready && record?.outline.manuscript !== undefined) return <ManuscriptForm key={record.id + ':' + record.updatedAt} initial={record} />;
  return <MinisterialScreen title="Editar pregação completa" backTo="/sermons"><Text style={ui.body}>{library.error || (library.ready ? 'Pregação completa não encontrada. Volte à sua coleção.' : 'Carregando pregação…')}</Text>{!!library.error && <ActionButton label="Tentar novamente" onPress={library.retry} />}</MinisterialScreen>;
}
