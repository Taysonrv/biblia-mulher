import { useAppTheme } from '@/components/app-theme';
import type { Palette } from '@/constants/design';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { agendaRepository } from '@/services/agenda';
import { useSavedSermons } from '@/hooks/use-saved-sermons';
import { dateInput, EVENT_CATEGORIES, eventToDraft, REMINDER_OPTIONS, reminderLabel, timeInput, type EventDraft } from '@/services/agenda-model';

function defaultDraft(date?: string, sermonId?: string, sermonTitle?: string): EventDraft {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 30, 0, 0);
  return { title: sermonTitle?.slice(0, 100) ?? '', category: sermonId ? 'Pregação' : 'Culto', date: date ?? dateInput(tomorrow), time: timeInput(tomorrow), location: '', notes: '', reminderMinutes: null, sermonId: sermonId ?? null };
}
export default function AgendaEventScreen() {
  const { palette: p } = useAppTheme();
  const styles = createStyles(p);
  const s = useMinisterialStyles();
  const params = useLocalSearchParams<{ id?: string | string[]; date?: string | string[]; sermonId?: string | string[]; sermonTitle?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const requestedSermonId = Array.isArray(params.sermonId) ? params.sermonId[0] : params.sermonId;
  const requestedSermonTitle = Array.isArray(params.sermonTitle) ? params.sermonTitle[0] : params.sermonTitle;
  const sermons = useSavedSermons();
  const [draft, setDraft] = useState<EventDraft>(() => defaultDraft(date, requestedSermonId, requestedSermonTitle));
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lock = useRef(false);
  const requestVersion = useRef(0);
  const load = useCallback(() => {
    const version = ++requestVersion.current;
    if (!id) {
      setDraft(defaultDraft(date, requestedSermonId, requestedSermonTitle)); setLoading(false); setLoadFailed(false); setError('');
      return;
    }
    setLoading(true);
    agendaRepository.list().then(events => {
      if (requestVersion.current !== version) return;
      const event = events.find(item => item.id === id);
      if (!event) { setLoadFailed(true); setError('Este compromisso não existe mais. Volte à agenda.'); }
      else { setDraft(eventToDraft(event)); setError(''); setLoadFailed(false); }
      setLoading(false);
    }).catch(() => { if (requestVersion.current === version) { setLoading(false); setLoadFailed(true); setError('Não foi possível carregar o compromisso. Tente novamente.'); } });
  }, [id, date, requestedSermonId, requestedSermonTitle]);
  useFocusEffect(useCallback(() => {
    load();
    return () => { requestVersion.current++; };
  }, [load]));
  function update<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setError('');
  }
  async function save() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const event = await agendaRepository.save(draft, id);
      const returnToAgenda = () => router.replace({ pathname: '/agenda', params: { eventId: event.id } });
      if (Platform.OS === 'web') { returnToAgenda(); return; }
      if (event.reminderState !== 'off' && event.reminderState !== 'scheduled') {
        Alert.alert('Compromisso salvo', reminderLabel(event) + '.',
          event.reminderState === 'denied' ? [
            { text: 'Continuar', onPress: returnToAgenda },
            { text: 'Abrir configurações', onPress: () => { returnToAgenda(); void Linking.openSettings().catch(() => Alert.alert('Configurações', 'Abra as configurações do aparelho e permita notificações para este app.')); } },
          ] : [{ text: 'Continuar', onPress: returnToAgenda }]);
      } else returnToAgenda();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar. Tente novamente.');
    } finally { lock.current = false; setBusy(false); }
  }
  async function remove() {
    if (!id || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await agendaRepository.remove(id); router.replace('/agenda'); }
    catch { setError('Não foi possível excluir o compromisso e cancelar seu lembrete. Tente novamente.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const disabled = busy || loading || loadFailed;
  return <MinisterialScreen title={id ? 'Editar compromisso' : 'Novo compromisso'} backTo="/agenda">
    {loading ? <ActivityIndicator accessibilityLabel="Carregando compromisso" color={p.accent} /> : null}
    <View style={s.card}>
      <Text style={s.badge}>TÍTULO</Text>
      <TextInput accessibilityLabel="Título do compromisso" editable={!disabled} style={styles.input} value={draft.title} maxLength={100}
        placeholder="Ex.: Encontro da comunidade" placeholderTextColor={p.muted} onChangeText={value => update('title', value)} />
      <Text style={s.badge}>TIPO DE COMPROMISSO</Text>
      <View style={styles.choices}>{EVENT_CATEGORIES.map(category => <Pressable key={category} accessibilityRole="button"
        accessibilityState={{ selected: draft.category === category, disabled }} disabled={disabled}
        style={[styles.choice, draft.category === category && styles.chosen]} onPress={() => update('category', category)}>
        <Text style={[styles.choiceText, draft.category === category && styles.chosenText]}>{category}</Text>
      </Pressable>)}</View>
      <Text style={s.badge}>DATA (DD/MM/AAAA)</Text>
      <TextInput accessibilityLabel="Data, dia mês e ano" editable={!disabled} style={styles.input} value={draft.date}
        placeholder="DD/MM/AAAA" placeholderTextColor={p.muted} maxLength={10} onChangeText={value => update('date', value)} />
      <Text style={s.badge}>HORÁRIO (HH:MM)</Text>
      <TextInput accessibilityLabel="Horário, horas e minutos" editable={!disabled} style={styles.input} value={draft.time}
        placeholder="19:30" placeholderTextColor={p.muted} maxLength={5} onChangeText={value => update('time', value)} />
      <Text style={s.body}>Use o horário local do aparelho.</Text>
      <Text style={s.badge}>LOCAL (OPCIONAL)</Text>
      <TextInput accessibilityLabel="Local" editable={!disabled} style={styles.input} value={draft.location} maxLength={150}
        placeholder="Igreja, endereço ou encontro online" placeholderTextColor={p.muted} onChangeText={value => update('location', value)} />
      <Text style={s.badge}>ANOTAÇÕES (OPCIONAL)</Text>
      <TextInput accessibilityLabel="Anotações do compromisso" editable={!disabled} style={[styles.input, styles.notes]} value={draft.notes}
        maxLength={1000} multiline placeholder="Tema, detalhes e preparação" placeholderTextColor={p.muted} onChangeText={value => update('notes', value)} />
    </View>
    <View style={s.card}>
      <Text style={s.heading}>Esboço para este compromisso (opcional)</Text>
      {sermons.error ? <Text accessibilityRole="alert" style={s.error}>{sermons.error}</Text> : null}
      {!sermons.ready && !sermons.error ? <Text style={s.body}>Carregando esboços…</Text> : null}
      {sermons.ready && !sermons.entries.length ? <Text style={s.body}>Você ainda não tem esboços salvos. Prepare uma mensagem em Apoio Ministerial.</Text> : null}
      {draft.sermonId && sermons.ready && !sermons.entries.some(item => item.id === draft.sermonId) ? <Text style={s.body}>O esboço vinculado não está mais salvo neste aparelho.</Text> : null}
      {draft.sermonId && sermons.entries.some(item => item.id === draft.sermonId) ? <Pressable accessibilityRole="button" style={s.back}
        onPress={() => router.push({ pathname: '/sermon-outline', params: { id: draft.sermonId! } })}>
        <Text style={s.badge}>ABRIR ESBOÇO VINCULADO →</Text>
      </Pressable> : null}
      <View style={styles.choices}>
        <Pressable accessibilityRole="button" disabled={disabled} style={[styles.choice, !draft.sermonId && styles.chosen]}
          onPress={() => update('sermonId', null)}><Text style={[styles.choiceText, !draft.sermonId && styles.chosenText]}>Sem esboço</Text></Pressable>
        {sermons.entries.map(item => <Pressable key={item.id} accessibilityRole="button" disabled={disabled}
          accessibilityState={{ selected: draft.sermonId === item.id, disabled }}
          style={[styles.choice, draft.sermonId === item.id && styles.chosen]}
          onPress={() => update('sermonId', item.id)}>
          <Text style={[styles.choiceText, draft.sermonId === item.id && styles.chosenText]}>{item.outline.theme}</Text>
        </Pressable>)}
      </View>
    </View>
    <View style={s.card}>
      <Text style={s.heading}>Quando lembrar?</Text>
      <View style={styles.choices}>{REMINDER_OPTIONS.map(option => <Pressable key={String(option.minutes)} accessibilityRole="button"
        accessibilityState={{ selected: draft.reminderMinutes === option.minutes, disabled }} disabled={disabled}
        style={[styles.choice, draft.reminderMinutes === option.minutes && styles.chosen]} onPress={() => update('reminderMinutes', option.minutes)}>
        <Text style={[styles.choiceText, draft.reminderMinutes === option.minutes && styles.chosenText]}>{option.label}</Text>
      </Pressable>)}</View>
      <Text style={s.body}>Ao salvar com um lembrete, o aparelho pode pedir permissão para notificações. O compromisso é salvo mesmo se você não permitir.</Text>
    </View>
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    {loadFailed ? <Pressable accessibilityRole="button" style={s.button} onPress={load}>
      <Text style={s.buttonText}>Tentar carregar novamente</Text>
    </Pressable> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      style={[s.button, disabled && { opacity: 0.5 }]} onPress={() => void save()}>
      <Text style={s.buttonText}>{busy ? 'Aguarde…' : 'Salvar compromisso'}</Text>
    </Pressable>
    {id ? <View style={s.card}>
      {confirmDelete ? <>
        <Text style={s.heading}>Excluir compromisso?</Text>
        <Text style={s.body}>O compromisso e o lembrete agendado serão removidos.</Text>
        <Pressable accessibilityRole="button" disabled={disabled} style={s.button} onPress={() => void remove()}>
          <Text style={s.buttonText}>Confirmar exclusão</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={disabled} style={styles.choice} onPress={() => setConfirmDelete(false)}>
          <Text style={styles.choiceText}>Manter compromisso</Text>
        </Pressable>
      </> : <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
        style={styles.choice} onPress={() => setConfirmDelete(true)}><Text style={s.error}>Excluir compromisso</Text></Pressable>}
    </View> : null}
  </MinisterialScreen>;
}
function createStyles(p: Palette) { return StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderColor: p.border, borderRadius: 14, padding: 14, fontSize: 16, color: p.text, backgroundColor: p.background },
  notes: { minHeight: 110, textAlignVertical: 'top' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 16, backgroundColor: p.surfaceRaised },
  chosen: { backgroundColor: p.accent },
  choiceText: { color: p.accent, fontSize: 14, fontWeight: '600' },
  chosenText: { color: p.ink },
}); }
