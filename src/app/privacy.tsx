import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { useUi } from '@/components/modern-ui';
import { useAppTheme } from '@/components/app-theme';
import { ActionButton } from '@/components/ui-controls';
import legal from '@/data/legal.json';

export default function PrivacyScreen() {
  const ui = useUi(); const { palette: p } = useAppTheme(); const [error, setError] = useState('');
  async function openPublicPage(url: string) {
    setError('');
    try { await Linking.openURL(url); }
    catch { setError('Não foi possível abrir a página. Confira sua conexão ou use o endereço exibido abaixo.'); }
  }
  async function compose(deletion: boolean) {
    setError('');
    const subject = deletion ? 'Exclusão de conta — Bíblia Smart' : 'Suporte — Bíblia Smart';
    const body = deletion ? 'Solicito a exclusão da minha conta do Bíblia Smart e dos dados associados na nuvem.\n\nE-mail cadastrado: \n\nEntendo que o atendimento é manual e que arquivos exportados e cópias locais não são apagados remotamente.' : '';
    try { await Linking.openURL(`mailto:${legal.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`); }
    catch { setError('Não foi possível abrir seu aplicativo de e-mail. Copie o endereço abaixo e envie a solicitação pelo seu serviço de e-mail.'); }
  }
  return <MinisterialScreen title="Privacidade e conta" backTo="/profile">
    <Text style={ui.body}>Atualizada em {legal.updated}</Text>
    <View style={ui.card}>
      <Text style={ui.cardTitle}>Solicitar exclusão de conta</Text>
      <Text style={ui.body}>Abra uma mensagem para o suporte e envie pelo seu e-mail. O atendimento é manual e exige confirmação de titularidade. Esta ação apenas prepara a mensagem; nenhum dado é apagado ao tocar no botão.</Text>
      <ActionButton label="Preparar pedido de exclusão" onPress={() => void compose(true)} />
      <Text selectable style={ui.body}>{legal.email}</Text>
      <Text style={ui.body}>Assunto: Exclusão de conta — Bíblia Smart. Envie preferencialmente pelo e-mail cadastrado. Nunca envie senha ou código de acesso.</Text>
      {!!error && <Text accessibilityRole="alert" style={{ color: p.danger }}>{error}</Text>}
    </View>
    <View style={ui.card}>
      <Text style={ui.cardTitle}>Páginas públicas</Text>
      <ActionButton secondary label="Abrir política no navegador" onPress={() => void openPublicPage(legal.privacyUrl)} />
      <Text selectable style={ui.body}>{legal.privacyUrl}</Text>
      <ActionButton secondary label="Abrir página de exclusão" onPress={() => void openPublicPage(legal.deletionUrl)} />
      <Text selectable style={ui.body}>{legal.deletionUrl}</Text>
    </View>
    {legal.sections.map(section => <View key={section.title} style={ui.card}><Text accessibilityRole="header" style={ui.cardTitle}>{section.title}</Text><Text selectable style={ui.body}>{section.body}</Text></View>)}
    <ActionButton secondary label="Entrar em contato com o suporte" onPress={() => void compose(false)} />
  </MinisterialScreen>;
}
