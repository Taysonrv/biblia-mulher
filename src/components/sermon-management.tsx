import { useCallback, useRef, useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from './app-theme';
import { useMinisterialStyles } from './ministerial-screen';
import { FeatureLink, useUi } from './modern-ui';
import { ActionButton } from './ui-controls';
import { savedSermons } from '@/services/saved-sermons';
import { useSubscription } from './subscription-provider';
import { MAX_SERMONS, SERMON_LIMITS, suggestSermonCopyTitle, type SavedSermon } from '@/services/sermon-repository';

export function SermonManagement({ message, entries }: { message: SavedSermon; entries: readonly SavedSermon[] }) {
  const { palette: p } = useAppTheme(); const ui = useUi(); const s = useMinisterialStyles();
  const { hasPremium } = useSubscription();
  const [open, setOpen] = useState(false); const [mode, setMode] = useState<'copy' | 'delete' | null>(null);
  const [title, setTitle] = useState(() => suggestSermonCopyTitle(message.outline.theme, entries));
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const locked = useRef(false); const active = useRef(false);
  useFocusEffect(useCallback(() => { active.current = true; return () => { active.current = false; }; }, []));
  function choose(next: 'copy' | 'delete' | null) { setMode(next); setError(''); Keyboard.dismiss(); }
  async function perform(operation: 'copy' | 'delete') {
    if (locked.current) return;
    if (operation === 'copy' && !hasPremium) { router.push('/subscription'); return; }
    locked.current = true; setBusy(true); setError(''); Keyboard.dismiss();
    try {
      if (operation === 'copy') {
        const copy = await savedSermons.duplicate(message.id, title, message.updatedAt);
        if (active.current) router.replace({ pathname: '/sermon-editor', params: { id: copy.id } });
      } else {
        await savedSermons.remove(message.id, message.updatedAt);
        if (active.current) router.replace('/sermons');
      }
    } catch (reason) {
      if (active.current) setError(reason instanceof Error ? reason.message : 'Não foi possível concluir. Tente novamente.');
    } finally { locked.current = false; if (active.current) setBusy(false); }
  }
  return <View style={ui.card}>
    <Pressable accessibilityRole="button" accessibilityLabel="Organizar mensagem" accessibilityState={{ expanded: open, disabled: busy }} disabled={busy}
      onPress={() => { setOpen(value => !value); choose(null); }}
      style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
      <Ionicons accessible={false} name="folder-open-outline" size={23} color={p.accent} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={ui.cardTitle}>Organizar mensagem</Text><Text style={ui.body}>Crie uma cópia ou organize sua coleção.</Text></View>
      <Ionicons accessible={false} name={open ? 'chevron-up' : 'chevron-down'} size={20} color={p.muted} />
    </Pressable>
    {open && <>
      {mode === null && <>
        {hasPremium ? <ActionButton secondary label="Duplicar mensagem" disabled={busy || entries.length >= MAX_SERMONS} onPress={() => choose('copy')} /> : <FeatureLink title="Duplicar com Premium" description="Prepare uma nova mensagem a partir desta." icon="sparkles-outline" href="/subscription" violet />}
        {entries.length >= MAX_SERMONS && <Text style={ui.body}>Sua coleção chegou a {MAX_SERMONS} esboços. Guarde um backup e libere espaço para criar uma cópia.</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Excluir mensagem" disabled={busy} onPress={() => choose('delete')}
          style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: p.border, padding: 14, alignItems: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Text style={[ui.buttonText, { color: p.danger }]}>Excluir mensagem</Text>
        </Pressable>
      </>}
      {mode === 'copy' && <>
        <Text accessibilityRole="header" style={ui.heading}>Uma nova mensagem, a partir desta</Text>
        <Text style={ui.body}>A cópia leva o esboço completo e suas notas pessoais. Você poderá editá-la sem alterar a mensagem original.</Text>
        <Text style={ui.cardTitle}>Título da cópia</Text>
        <TextInput accessibilityLabel="Título da cópia" value={title} onChangeText={value => { setTitle(value); setError(''); }} maxLength={SERMON_LIMITS.theme}
          editable={!busy} multiline style={[s.input, { minHeight: 80 }]} placeholder="Escolha um título para a nova mensagem" placeholderTextColor={p.subtle} />
        <Text style={ui.body}>{title.length}/{SERMON_LIMITS.theme}</Text>
        <ActionButton label={hasPremium ? 'Criar cópia e editar' : 'Conhecer o Premium para duplicar'} disabled={busy || !title.trim()} busy={busy} onPress={() => void perform('copy')} />
        <ActionButton secondary label="Cancelar cópia" disabled={busy} onPress={() => choose(null)} />
      </>}
      {mode === 'delete' && <>
        <Text accessibilityRole="header" style={[ui.heading, { color: p.danger }]}>Excluir esta mensagem?</Text>
        <Text style={ui.cardTitle}>{message.outline.theme}</Text>
        <Text style={ui.body}>O esboço e suas notas serão removidos definitivamente deste aparelho. Backups já exportados continuam guardados.</Text>
        <FeatureLink title="Guardar um backup antes" description="Salve uma cópia da sua jornada." icon="shield-checkmark-outline" href="/my-data" />
        <ActionButton secondary label="Manter mensagem" disabled={busy} onPress={() => choose(null)} />
        <Pressable accessibilityRole="button" accessibilityLabel="Confirmar exclusão da mensagem" accessibilityState={{ disabled: busy, busy }} disabled={busy}
          onPress={() => void perform('delete')} style={({ pressed }) => ({ minHeight: 50, borderRadius: 16, padding: 14, backgroundColor: p.surfaceRaised,
            borderWidth: 1, borderColor: p.danger, alignItems: 'center', opacity: busy ? 0.5 : pressed ? 0.7 : 1 })}>
          <Text style={[ui.buttonText, { color: p.danger }]}>{busy ? 'Excluindo…' : 'Confirmar exclusão da mensagem'}</Text>
        </Pressable>
      </>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    </>}
  </View>;
}
