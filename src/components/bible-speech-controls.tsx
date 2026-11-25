import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ActionButton, FilterChips } from './ui-controls';
import { useUi } from './modern-ui';
import { useAppTheme } from './app-theme';
import type { useBibleSpeech } from '@/hooks/use-bible-speech';

export function BibleSpeechControls({ speech, selected }: { speech: ReturnType<typeof useBibleSpeech>; selected: number }) {
  const ui = useUi(); const { palette: p } = useAppTheme(); const [settings, setSettings] = useState(false);
  const playing = speech.matches && (speech.status === 'speaking' || speech.status === 'loading');
  const paused = speech.matches && (speech.status === 'paused' || speech.status === 'error');
  const rateNames = { '0.75': 'Mais devagar', '1': 'Normal', '1.25': 'Mais rápido' } as const;
  return <View style={[ui.card, { gap: 8 }]}>
    <Text style={ui.cardTitle}>Ouvir a Bíblia</Text>
    <Text accessibilityLiveRegion="polite" style={ui.body}>{speech.status === 'loading' && speech.matches ? 'Preparando a voz do aparelho…' : playing ? `Lendo o versículo ${speech.verse}` : paused ? `Leitura interrompida no versículo ${speech.verse}` : speech.status === 'finished' && speech.matches ? 'Capítulo concluído em voz alta.' : 'Leitura com a voz em português do aparelho.'}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <View style={{ flexGrow: 1 }}><ActionButton label={playing ? 'Pausar leitura' : paused ? 'Continuar ouvindo' : 'Ouvir capítulo'} disabled={!speech.matches} busy={speech.status === 'loading' && speech.matches} onPress={() => { if (playing) void speech.pause(); else void speech.play(); }} /></View>
      {(playing || paused) && <View style={{ flexGrow: 1 }}><ActionButton secondary label="Parar leitura" onPress={() => void speech.stop()} /></View>}
    </View>
    {selected > 0 && <ActionButton secondary label={`Ouvir a partir do versículo ${selected}`} disabled={!speech.matches} onPress={() => void speech.play(selected)} />}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: settings }} onPress={() => {
      if (!settings) void speech.loadVoices(); setSettings(value => !value);
    }} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}>
      <Text style={{ color: p.accent, fontSize: 14, fontWeight: '600' }}>{settings ? 'Ocultar ajustes de voz' : 'Voz e velocidade'}</Text>
    </Pressable>
    {settings && <View style={{ gap: 10 }}>
      <Text style={ui.body}>Velocidade</Text>
      <FilterChips label="Velocidade da leitura em voz alta" values={['Mais devagar', 'Normal', 'Mais rápido']} selected={rateNames[String(speech.rate) as keyof typeof rateNames]} onSelect={value => speech.setRate(Number(Object.keys(rateNames).find(key => rateNames[key as keyof typeof rateNames] === value)))} />
      <Text style={ui.body}>Voz em português</Text>
      {!speech.voices.length && <><Text style={ui.body}>Não encontramos vozes em português ainda. Confira as configurações de voz do aparelho.</Text><ActionButton secondary label="Buscar vozes novamente" onPress={() => void speech.loadVoices()} /></>}
      {speech.voices.map(voice => <Pressable key={voice.identifier} accessibilityRole="radio" aria-checked={speech.voice === voice.identifier} accessibilityState={{ checked: speech.voice === voice.identifier }} onPress={() => speech.setVoice(voice.identifier)}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', padding: 10, borderWidth: 1, borderRadius: 12, borderColor: speech.voice === voice.identifier ? p.accent : p.border, backgroundColor: speech.voice === voice.identifier ? p.accentSurface : p.surface, opacity: pressed ? 0.65 : 1 })}>
        <Text style={ui.body}>{voice.name} · {voice.language}{speech.voice === voice.identifier ? ' · Selecionada' : ''}</Text>
      </Pressable>)}
      <Text style={ui.body}>Ao continuar, a leitura repete o versículo interrompido. Alterar voz ou velocidade pausa a leitura. Ao sair do capítulo ou colocar o app em segundo plano, a voz é interrompida.</Text>
      <Text style={ui.body}>Para ouvir sem internet, instale uma voz offline em português nas configurações de voz do aparelho. A voz e a pronúncia dependem do sistema; o texto mantém a edição Almeida 1911.</Text>
    </View>}
    {!!speech.error && speech.matches && <Text accessibilityRole="alert" style={{ color: p.danger, lineHeight: 21 }}>{speech.error}</Text>}
  </View>;
}
