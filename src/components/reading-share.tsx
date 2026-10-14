import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { ReadingEntry } from '@/services/reading-repository';
import { formatReadingShare } from '@/services/reading-share-model';
import { shareReading } from '@/services/reading-sharing';
import { ActionButton, FilterChips } from './ui-controls';
import { useUi } from './modern-ui';
import { useMinisterialStyles } from './ministerial-screen';

export function ReadingShare({ entry }: { entry: ReadingEntry }) {
  const ui = useUi(); const s = useMinisterialStyles();
  const [open, setOpen] = useState(false); const [includeNote, setIncludeNote] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [feedback, setFeedback] = useState('');
  const locked = useRef(false); const focused = useRef(false); const session = useRef(0);
  useFocusEffect(useCallback(() => {
    focused.current = true; session.current++; setBusy(locked.current);
    return () => { focused.current = false; session.current++; setOpen(false); setIncludeNote(false); setError(''); setFeedback(''); };
  }, []));
  const preview = formatReadingShare(entry, includeNote && !!entry.note.trim());
  async function share() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setFeedback('');
    const request = session.current;
    try {
      const result = await shareReading(preview.message, preview.title);
      if (focused.current && request === session.current) setFeedback(result === 'text' ? 'Selecione o texto da prévia para copiar e compartilhar.' : result === 'cancelled' ? 'Compartilhamento cancelado.' : 'Opções de compartilhamento abertas.');
    } catch { if (focused.current && request === session.current) setError('Não foi possível abrir o compartilhamento. Tente novamente.'); }
    finally { locked.current = false; if (focused.current) setBusy(false); }
  }
  return <View style={{ gap: 12 }}>
    <ActionButton secondary label={open ? 'Fechar prévia de compartilhamento' : 'Compartilhar versículo'} disabled={busy}
      onPress={() => { setOpen(value => !value); setIncludeNote(false); setError(''); setFeedback(''); }} />
    {open && <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.cardTitle}>Prévia de compartilhamento</Text>
      {!!entry.note.trim() && <FilterChips label="Texto a compartilhar" values={['Somente versículo', 'Versículo e reflexão']} selected={includeNote ? 'Versículo e reflexão' : 'Somente versículo'}
        onSelect={value => { if (!busy) { setIncludeNote(value === 'Versículo e reflexão'); setFeedback(''); } }} />}
      <Text selectable style={s.body}>{preview.message}</Text>
      <ActionButton label="Abrir opções de compartilhamento" busy={busy} onPress={() => void share()} />
      {!!feedback && <Text accessibilityLiveRegion="polite" style={ui.body}>{feedback}</Text>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    </View>}
  </View>;
}
