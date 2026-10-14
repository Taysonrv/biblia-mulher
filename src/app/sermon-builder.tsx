import { withPremiumAccess } from '@/components/premium-access';
import { useAppTheme } from '@/components/app-theme';
import { useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MinisterialScreen, useMinisterialStyles } from '@/components/ministerial-screen';
import { ActionButton } from '@/components/ui-controls';
import { MAX_SERMON_INPUT, normalizeSermonInput } from '@/services/sermon';

function SermonBuilderScreen() {
  const { palette: p } = useAppTheme();
  const s = useMinisterialStyles();
  const params = useLocalSearchParams<{ topic?: string | string[] }>();
  const initial = Array.isArray(params.topic) ? params.topic[0] : params.topic;
  const [topic, setTopic] = useState((initial ?? '').slice(0, MAX_SERMON_INPUT));
  const [error, setError] = useState('');
  function createOutline() {
    const input = normalizeSermonInput(topic);
    if (!input) { setError('Escreva um tema, uma passagem ou um assunto.'); return; }
    Keyboard.dismiss();
    setError('');
    router.push({ pathname: '/sermon-outline', params: { topic: input } });
  }
  return (
    <MinisterialScreen title="Preparar pregação" backTo="/support">
      <Text style={s.heading}>Sobre o que você vai pregar hoje?</Text>
      <Text style={s.body}>Informe um tema, uma passagem ou um assunto para começar.</Text>
      <View style={s.card}>
        <Text nativeID="sermon-topic-label" style={s.badge}>TEMA / PASSAGEM / ASSUNTO</Text>
        <TextInput accessibilityLabel="Tema, passagem ou assunto" accessibilityLabelledBy="sermon-topic-label"
          style={s.input} value={topic} multiline maxLength={MAX_SERMON_INPUT}
          placeholder="Ex.: Salmos 23, perdão ou fé em tempos difíceis" placeholderTextColor={p.muted}
          onChangeText={value => { setTopic(value); setError(''); }} />
        <Text style={s.body}>{topic.length}/{MAX_SERMON_INPUT}</Text>
        {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
        <ActionButton label="Criar esboço" onPress={createOutline} />
      </View>
      <Text style={s.body}>Precisa de uma ideia? Toque em um exemplo:</Text>
      {['Salmos 23', 'Perdão', 'Oração e ansiedade'].map(example => (
        <Pressable key={example} accessibilityRole="button" style={({ pressed }) => [s.card, pressed && { opacity: 0.72 }]}
          onPress={() => { setTopic(example); setError(''); }}>
          <Text style={s.heading}>{example}</Text>
        </Pressable>
      ))}
    </MinisterialScreen>
  );
}

export default withPremiumAccess(SermonBuilderScreen, 'ministerial', '/support');
