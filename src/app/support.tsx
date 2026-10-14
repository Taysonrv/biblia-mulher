import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { MinisterialScreen } from '@/components/ministerial-screen';
import { FeatureLink, IconBadge, OrbitCard, PremiumBadge, useUi } from '@/components/modern-ui';
import { useAppTheme } from '@/components/app-theme';

export default function SupportScreen() {
  const { palette: p } = useAppTheme();
  const ui = useUi();
  return <MinisterialScreen title="Apoio ministerial" backTo="/">
    <OrbitCard violet>
      <IconBadge name="mic-outline" violet />
      <PremiumBadge />
      <Text style={[ui.eyebrow, { color: p.violet }]}>UMA MENSAGEM COM PROPÓSITO</Text>
      <Text style={ui.heading}>Sobre o que você vai pregar hoje?</Text>
      <Text style={ui.body}>Organize sua mensagem com um esboço de apoio, referências bíblicas e perguntas para reflexão.</Text>
      <Pressable accessibilityRole="button" style={({ pressed }) => [ui.button, pressed && ui.pressed]}
        onPress={() => router.push('/sermon-builder')}>
        <Text style={ui.buttonText}>Preparar pregação</Text><Ionicons name="arrow-forward" size={18} color={p.ink} />
      </Pressable>
    </OrbitCard>
    <FeatureLink title="Conheça o Premium" description="A criação de esboços e o modo de apresentação fazem parte da assinatura. Sua agenda e seus textos salvos continuam gratuitos." icon="sparkles-outline" href="/subscription" violet />
    <FeatureLink title="Meus esboços" description="Salve, adapte e retome suas mensagens, mesmo offline." icon="documents-outline" href="/sermons" violet />
    <FeatureLink title="Mentorias e Pregações" description="Aulas e mensagens em vídeo e áudio para assinantes Premium." icon="play-circle-outline" href="/premium-library" violet />
    <FeatureLink title="Agenda ministerial" description="Cultos, estudos, reuniões e pregações no seu calendário."
      icon="calendar-outline" href="/agenda" />
    <View style={ui.card}>
      <View style={ui.row}><IconBadge name="notifications-outline" /><Text style={[ui.heading, { flex: 1 }]}>Lembretes no seu tempo</Text></View>
      <Text style={ui.body}>Escolha um lembrete ao cadastrar seu compromisso e reserve espaço para se preparar. As notificações dependem da sua permissão.</Text>
    </View>
    <View style={ui.card}>
      <Text style={ui.eyebrow}>ESTUDE. REFLITA. COMPARTILHE.</Text>
      <Text style={ui.body}>Os esboços são roteiros iniciais de apoio. Leia as passagens no contexto e adapte a mensagem à sua comunidade.</Text>
    </View>
  </MinisterialScreen>;
}
