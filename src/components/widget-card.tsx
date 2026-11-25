import { useState } from 'react';
import { Platform, Text, TurboModuleRegistry, View } from 'react-native';
import { useUi } from './modern-ui';
import { ActionButton } from './ui-controls';
export function WidgetCard() {
  const ui = useUi(); const [feedback, setFeedback] = useState(''); const [busy, setBusy] = useState(false);
  if (Platform.OS !== 'android') return null;
  async function add() {
    if (!TurboModuleRegistry.get('AndroidWidget')) { setFeedback('O widget estará disponível na nova build Android. Após atualizar, mantenha pressionada a tela do celular e escolha Widgets → Bíblia Smart.'); return; }
    setBusy(true);
    try {
      const { requestPinWidget } = await import('react-native-android-widget');
      const accepted = await requestPinWidget({ widgetName: 'BibliaSmartWord' });
      setFeedback(accepted ? 'Confirme a inclusão na janela do Android. Se ela não aparecer, use Widgets → Bíblia Smart na tela do celular.' : 'Mantenha pressionada a tela do celular e escolha Widgets → Bíblia Smart.');
    } catch { setFeedback('Não foi possível abrir a inclusão automática. Use Widgets → Bíblia Smart na tela do celular.'); }
    finally { setBusy(false); }
  }
  return <View style={ui.card}><Text style={ui.cardTitle}>A Palavra na tela do celular</Text><Text style={ui.body}>Widget com Salmos 23:1 e atalhos para a Bíblia e a Harpa Cristã. Funciona sem internet.</Text><ActionButton secondary label="Adicionar widget Android" busy={busy} onPress={() => void add()} />{!!feedback && <Text accessibilityLiveRegion="polite" style={ui.body}>{feedback}</Text>}</View>;
}
