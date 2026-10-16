import { useAppTheme } from '@/components/app-theme';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { AgendaCalendar } from '@/components/agenda-calendar';
import { useSavedSermons } from '@/hooks/use-saved-sermons';
import { agendaRepository } from '@/services/agenda';
import { dateInput, localDateKey, reminderLabel, timeInput, type AgendaEvent } from '@/services/agenda-model';

export default function AgendaScreen() {
  const { palette: p } = useAppTheme();
  const s = useMinisterialStyles();
  const sermons = useSavedSermons();
  const params = useLocalSearchParams<{ eventId?: string | string[] }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date());
  const [snapshotTime, setSnapshotTime] = useState(() => Date.now());
  const requestVersion = useRef(0);
  const load = useCallback(() => {
    const version = ++requestVersion.current;
    setLoading(true);
    agendaRepository.list().then(items => {
      if (requestVersion.current !== version) return;
      setEvents(items);
      setError('');
      setLoading(false);
      setSnapshotTime(Date.now());
      const target = items.find(event => event.id === eventId);
      if (target) { const date = new Date(target.startsAt); setSelected(date); setMonth(date); }
    }).catch(() => {
      if (requestVersion.current === version) { setLoading(false); setError('Não foi possível carregar sua agenda. Seus dados foram preservados. Tente novamente.'); }
    });
  }, [eventId]);
  useFocusEffect(useCallback(() => {
    load();
    const timer = setInterval(() => setSnapshotTime(Date.now()), 60_000);
    return () => { requestVersion.current++; clearInterval(timer); };
  }, [load]));
  const selectedKey = localDateKey(selected);
  const daily = events.filter(event => localDateKey(new Date(event.startsAt)) === selectedKey);
  const upcoming = events.filter(event => Date.parse(event.startsAt) > snapshotTime).slice(0, 5);
  function newEvent() {
    router.push({ pathname: '/agenda-event', params: { date: dateInput(selected) } });
  }
  function eventCard(event: AgendaEvent) {
    const linked = event.sermonId ? sermons.entries.find(item => item.id === event.sermonId) : undefined;
    return <View key={event.id} style={s.card}>
      <Text style={s.badge}>{event.category.toUpperCase()} • {dateInput(new Date(event.startsAt))} ÀS {timeInput(new Date(event.startsAt))}</Text>
      <Text style={s.heading}>{event.title}</Text>
      {event.location ? <Text style={s.body}>{event.location}</Text> : null}
      <Text style={s.body}>{reminderLabel(event, snapshotTime)}</Text>
      {linked ? <Pressable accessibilityRole="button" accessibilityLabel={'Abrir esboço ' + linked.outline.theme}
        style={s.button} onPress={() => router.push({ pathname: '/sermon-outline', params: { id: linked.id } })}>
        <Text style={s.buttonText}>Abrir esboço: {linked.outline.theme}</Text>
      </Pressable> : null}
      {event.sermonId && sermons.ready && !linked ? <Text style={s.body}>O esboço vinculado não está disponível neste aparelho.</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={'Ver ou editar ' + event.title}
        style={s.back} onPress={() => router.push({ pathname: '/agenda-event', params: { id: event.id } })}>
        <Text style={s.badge}>VER / EDITAR COMPROMISSO →</Text>
      </Pressable>
    </View>;
  }
  return <MinisterialScreen title="Agenda ministerial" backTo="/support">
    <Text style={s.body}>Organize seus compromissos e reserve tempo para se preparar.</Text>
    {loading ? <ActivityIndicator accessibilityLabel="Carregando agenda" color={p.accent} /> : null}
    {error ? <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text>
      <Pressable accessibilityRole="button" style={s.button} onPress={load}><Text style={s.buttonText}>Tentar novamente</Text></Pressable>
    </View> : null}
    <AgendaCalendar month={month} selected={selectedKey}
      marked={new Set(events.map(event => localDateKey(new Date(event.startsAt))))}
      onSelect={setSelected} onMonth={date => { setMonth(date); setSelected(date); }} />
    <Pressable accessibilityRole="button" style={s.back} onPress={() => { const today = new Date(); setMonth(today); setSelected(today); }}>
      <Text style={s.badge}>IR PARA HOJE</Text>
    </Pressable>
    <Text style={s.heading}>{dateInput(selected)}</Text>
    {!loading && !error && daily.length === 0 ? <Text style={s.body}>Nenhum compromisso neste dia.</Text> : null}
    {!error ? daily.map(eventCard) : null}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading || !!error }}
      disabled={loading || !!error} style={[s.button, (loading || !!error) && { opacity: 0.5 }]} onPress={newEvent}>
      <Text style={s.buttonText}>Novo compromisso</Text>
    </Pressable>
    {!error && upcoming.length > 0 ? <><Text style={s.heading}>Próximos compromissos</Text>{upcoming.map(eventCard)}</> : null}
    <Text style={s.body}>Os compromissos são salvos neste aparelho. Datas e horários seguem o horário local do dispositivo.</Text>
  </MinisterialScreen>;
}
