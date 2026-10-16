import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { agendaRepository } from '@/services/agenda';
import { dateInput, timeInput, type AgendaEvent } from '@/services/agenda-model';
import { useSavedSermons } from '@/hooks/use-saved-sermons';
import {
  PREPARATION_TASKS, preparationRepository, preparationSummary,
  type PreparationProgress, type PreparationTaskId,
} from '@/services/ministerial-preparation';

export default function MinisterialPreparationScreen() {
  const s = useMinisterialStyles();
  const sermons = useSavedSermons();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [progress, setProgress] = useState<PreparationProgress>({});
  const [loading, setLoading] = useState(true);
  const [snapshotTime, setSnapshotTime] = useState(0);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const saving = useRef(false);
  const request = useRef(0);

  const refresh = useCallback(() => {
    const version = ++request.current;
    setLoading(true);
    Promise.all([agendaRepository.list(), preparationRepository.read()])
      .then(([appointments, checklist]) => {
        if (request.current !== version) return;
        setEvents(appointments);
        setProgress(checklist);
        setSnapshotTime(Date.now());
        setError('');
      })
      .catch(reason => {
        if (request.current === version) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o painel.');
      })
      .finally(() => { if (request.current === version) setLoading(false); });
  }, []);
  useFocusEffect(useCallback(() => {
    refresh();
    return () => { request.current++; };
  }, [refresh]));

  async function toggle(eventId: string, taskId: PreparationTaskId) {
    if (saving.current) return;
    saving.current = true;
    setSavingId(eventId + ':' + taskId);
    setError('');
    try {
      setProgress(await preparationRepository.toggle(eventId, taskId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar a tarefa.');
    } finally {
      saving.current = false;
      setSavingId('');
    }
  }

  const upcoming = events.filter(event => new Date(event.startsAt).getTime() > snapshotTime).slice(0, 10);
  const summary = preparationSummary(progress, upcoming.map(event => event.id));
  return <MinisterialScreen title="Minha preparação" backTo="/support">
    <Text style={s.body}>Prepare seus próximos compromissos em um só lugar. Marque cada etapa conforme avançar; tudo fica salvo neste aparelho.</Text>
    {!loading && !error && upcoming.length > 0 ? <View style={s.card}>
      <Text style={s.heading}>Resumo da preparação</Text>
      <Text style={s.body}>{upcoming.length} compromissos • {summary.completed} de {summary.total} etapas concluídas ({summary.percentage}%)</Text>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: summary.percentage }}
        style={{ height: 12, borderRadius: 8, backgroundColor: '#D4D7D6', overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${summary.percentage}%`, backgroundColor: '#687B65', borderRadius: 8 }} />
      </View>
    </View> : null}
    {loading ? <ActivityIndicator accessibilityLabel="Carregando preparação" /> : null}
    {error ? <View style={s.card}><Text accessibilityRole="alert" style={s.error}>{error}</Text>
      <Pressable accessibilityRole="button" onPress={refresh} style={s.back}><Text style={s.badge}>TENTAR NOVAMENTE</Text></Pressable>
    </View> : null}
    {!loading && !error && upcoming.length === 0 ? <View style={s.card}>
      <Text style={s.heading}>Nenhum compromisso futuro</Text>
      <Text style={s.body}>Cadastre um culto, estudo ou pregação na Agenda Ministerial para começar.</Text>
    </View> : null}
    {!loading && upcoming.map(event => {
      const checked = progress[event.id] ?? [];
      const itemProgress = preparationSummary(progress, [event.id]);
      const linked = event.sermonId ? sermons.entries.find(item => item.id === event.sermonId) : undefined;
      return <View key={event.id} style={s.card}>
        <Text style={s.badge}>{event.category.toUpperCase()} • {dateInput(new Date(event.startsAt))} ÀS {timeInput(new Date(event.startsAt))}</Text>
        <Text style={s.heading}>{event.title}</Text>
        {event.location ? <Text style={s.body}>{event.location}</Text> : null}
        <Text style={s.body}>Preparação: {itemProgress.completed} de {itemProgress.total} etapas concluídas • {itemProgress.percentage}%</Text>
        <View accessibilityRole="progressbar" accessibilityLabel={'Progresso da preparação de ' + event.title}
          accessibilityValue={{ min: 0, max: 100, now: itemProgress.percentage }}
          style={{ height: 10, borderRadius: 8, backgroundColor: '#D4D7D6', overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${itemProgress.percentage}%`, backgroundColor: '#687B65', borderRadius: 8 }} />
        </View>
        {itemProgress.percentage === 100 ? <Text style={s.badge}>PREPARAÇÃO CONCLUÍDA ✓</Text> : null}
        {PREPARATION_TASKS.map(task => {
          const done = checked.includes(task.id);
          const disabled = !!savingId;
          return <Pressable key={task.id} accessibilityRole="checkbox"
            accessibilityState={{ checked: done, disabled }}
            disabled={disabled} style={s.back} onPress={() => void toggle(event.id, task.id)}>
            <Text style={s.body}>{done ? '☑' : '☐'} {task.title}</Text>
          </Pressable>;
        })}
        {linked ? <Pressable accessibilityRole="button" style={s.button}
          onPress={() => router.push({ pathname: '/sermon-outline', params: { id: linked.id } })}>
          <Text style={s.buttonText}>Abrir esboço: {linked.outline.theme}</Text>
        </Pressable> : null}
        {event.sermonId && sermons.ready && !linked ? <Text style={s.body}>Esboço vinculado não encontrado neste aparelho.</Text> : null}
        <Pressable accessibilityRole="button" style={s.back}
          onPress={() => router.push({ pathname: '/agenda-event', params: { id: event.id } })}>
          <Text style={s.badge}>VER / EDITAR COMPROMISSO →</Text>
        </Pressable>
      </View>;
    })}
    <Pressable accessibilityRole="button" style={s.button} onPress={() => router.push('/agenda')}>
      <Text style={s.buttonText}>Abrir Agenda Ministerial</Text>
    </Pressable>
  </MinisterialScreen>;
}
