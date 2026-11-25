import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useUi, FeatureLink } from './modern-ui';
import { useMinisterialStyles } from './ministerial-screen';
import { useAppTheme } from './app-theme';
import { ActionButton } from './ui-controls';
import { useSubscription } from './subscription-provider';
import { buildPreachingDraft, preachingWordCount } from '@/services/sermon-preaching';
import { SERMON_LIMITS, type SavedSermon } from '@/services/sermon-repository';
import type { SermonOutline } from '@/services/sermon';
import { generatePreachingWithAi, preachingAiConfigured, preachingTiming, PREACHING_DURATIONS, type PreachingDuration } from '@/services/sermon-ai';
import { savedSermons } from '@/services/saved-sermons';

export function SermonPreachingComposer({ message }: { message: SavedSermon }) {
  const ui = useUi(); const s = useMinisterialStyles(); const { palette: p } = useAppTheme(); const { hasPremium, hasPremiumPlus } = useSubscription();
  const [draft, setDraft] = useState<SermonOutline | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [duration, setDuration] = useState<PreachingDuration>(40);
  const [consent, setConsent] = useState(false);
  const locked = useRef(false); const active = useRef(false);
  useFocusEffect(useCallback(() => { active.current = true; return () => { active.current = false; }; }, []));
  function prepare() {
    if (!hasPremium) { router.push('/subscription'); return; }
    try { setDraft(buildPreachingDraft(message.outline)); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível montar o texto. Seu esboço foi preservado.'); }
  }
  async function generate() {
    if (locked.current || !consent || !hasPremiumPlus) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const generated = await generatePreachingWithAi(message.outline, duration);
      if (active.current) setDraft(generated);
    } catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : 'Não foi possível gerar o texto.'); }
    finally { locked.current = false; if (active.current) setBusy(false); }
  }
  async function save() {
    if (locked.current || !draft || !hasPremium) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const next = await savedSermons.create(message.topic, draft);
      if (active.current) router.push({ pathname: '/sermon-outline', params: { id: next.id } });
    } catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Sua prévia continua aqui.'); }
    finally { locked.current = false; if (active.current) setBusy(false); }
  }
  return <View style={ui.card}>
    <Text style={ui.cardTitle}>Do esboço ao texto para pregar</Text>
    <Text style={ui.body}>Organize o conteúdo deste esboço em uma versão para ler em voz alta, com abertura, transições, perguntas, aplicação e encerramento. A prévia é editável e o original será preservado.</Text>
    {!draft && hasPremium && <>
      <Text style={ui.cardTitle}>Premium+ · Pregação completa por IA</Text>
      {!hasPremiumPlus && <FeatureLink title="Conhecer o Premium+" description="Geração longa por IA com duração escolhida e cota de uso." icon="sparkles-outline" href="/subscription" violet />}
      <Text style={ui.cardTitle}>Duração desejada</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Duração da pregação" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PREACHING_DURATIONS.map(minutes => <Pressable key={minutes} accessibilityRole="radio" aria-checked={duration === minutes} accessibilityState={{ checked: duration === minutes, disabled: busy }} disabled={busy}
          onPress={() => setDuration(minutes)} style={[ui.pill, { minHeight: 44, justifyContent: 'center', backgroundColor: duration === minutes ? p.accentSurface : p.surface, borderColor: duration === minutes ? p.accent : p.border }]}>
          <Text style={[ui.body, { color: p.text }]}>{minutes} minutos</Text>
        </Pressable>)}
      </View>
      <Text style={ui.body}>Meta de cerca de {duration * 120} palavras, calculada a 120 palavras por minuto. O tempo real varia com pausas, leitura bíblica e interação.</Text>
      <Text style={ui.body}>{preachingAiConfigured ? 'A IA desenvolve contexto, explicação dos três pontos, exemplos hipotéticos e aplicação. Revise o conteúdo e as referências antes de pregar.' : 'Geração por IA aguardando ativação do servidor. A montagem local produz um rascunho curto e não preenche a duração escolhida.'}</Text>
      <Pressable accessibilityRole="checkbox" aria-checked={consent} accessibilityLabel="Autorizar envio do esboço ao Google Gemini" accessibilityState={{ checked: consent, disabled: busy }} disabled={busy} onPress={() => setConsent(value => !value)} style={[ui.card, { minHeight: 44, borderColor: consent ? p.accent : p.border }]}>
        <Text style={ui.body}>{consent ? '☑' : '☐'} Autorizo enviar o tema e o conteúdo deste esboço ao Google Gemini para gerar a pregação. O campo de notas pessoais não será enviado. No serviço gratuito, o Google pode usar o conteúdo para melhorar seus produtos. Não inclua informações pessoais ou confidenciais. A geração consome a cota disponível e pode levar alguns minutos.</Text>
      </Pressable>
      <ActionButton label={busy ? 'Desenvolvendo a pregação…' : `Gerar pregação por IA · ${duration} min`} disabled={busy || !hasPremiumPlus || !consent || !preachingAiConfigured} busy={busy} onPress={() => void generate()} />
    </>}
    {!hasPremium ? <FeatureLink title="Montar pregação com Premium" description="Prepare sua mensagem para ler no púlpito." icon="document-text-outline" href="/subscription" violet />
      : !draft ? <ActionButton secondary label="Montar roteiro desenvolvido · Premium" disabled={busy} onPress={prepare} /> : <>
        <Text style={ui.body}>Esta montagem usa o conteúdo do seu esboço. Revise os trechos que ainda sejam instruções de preparação, adapte exemplos e confira as referências antes de pregar. Não são acrescentadas citações bíblicas ou relatos pessoais.</Text>
        <Text style={ui.body}>Aproximadamente {preachingWordCount(draft)} palavras · leitura estimada entre {preachingTiming(draft, duration).minimum} e {preachingTiming(draft, duration).maximum} minutos, a 100–140 palavras/minuto. Essa faixa não inclui tempo extra de pausas ou leitura de outras passagens. Meta escolhida: {duration} minutos. Suas notas pessoais não entram nesta nova cópia.</Text>
        {preachingWordCount(draft) < duration * 120 * 0.8 && <Text style={ui.body}>O texto ainda está abaixo da extensão planejada. Amplie o desenvolvimento antes de usá-lo como mensagem de {duration} minutos.</Text>}
        {([
          ['Título da pregação', draft.theme, SERMON_LIMITS.theme, (text: string) => setDraft(value => value && ({ ...value, theme: text }))],
          ['Abertura e introdução', draft.introduction, SERMON_LIMITS.body, (text: string) => setDraft(value => value && ({ ...value, introduction: text }))],
          ...draft.points.map((point, index) => [point.title, point.body, SERMON_LIMITS.body, (text: string) => setDraft(value => value && ({ ...value, points: value.points.map((row, position) => position === index ? { ...row, body: text } : row) }))]),
          ['Aplicação', draft.application, SERMON_LIMITS.body, (text: string) => setDraft(value => value && ({ ...value, application: text }))],
          ['Encerramento', draft.conclusion, SERMON_LIMITS.body, (text: string) => setDraft(value => value && ({ ...value, conclusion: text }))],
        ] as [string, string, number, (value: string) => void][]).map(([label, value, limit, change], index) => <View key={index} style={{ gap: 6 }}>
          <Text style={ui.cardTitle}>{label}</Text>
          <TextInput accessibilityLabel={label} value={value} onChangeText={change} maxLength={limit} multiline editable={!busy} placeholderTextColor={p.subtle}
            style={[s.input, { minHeight: index === 0 ? 64 : 160 }]} />
          <Text style={ui.body}>{value.length}/{limit}</Text>
        </View>)}
        <Text style={ui.body}>Depois de salvar, toque em Apresentar mensagem para ler por seções e ajustar o tamanho do texto.</Text>
        <ActionButton label="Salvar pregação como nova mensagem" disabled={busy || !draft.theme.trim()} busy={busy} onPress={() => void save()} />
        <ActionButton secondary label="Cancelar montagem" disabled={busy} onPress={() => { setDraft(null); setError(''); }} />
      </>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}
