import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { FeatureLink, ScreenFrame, ScreenHeading, useUi } from '@/components/modern-ui';
import { AccountCard } from '@/components/account-card';
import { SubscriptionCard } from '@/components/subscription-card';
import { useAppTheme } from '@/components/app-theme';

export default function ProfileScreen() {
  const { palette: p } = useAppTheme();
  const ui = useUi();
  const { width, fontScale } = useWindowDimensions();
  const stackOptions = width < 360 || fontScale > 1.3;
  const theme = useAppTheme();
  return <ScreenFrame>
    <ScreenHeading eyebrow="UM ESPAÇO SEU" title="Minha jornada."
      subtitle="Sua fé, seus momentos e seus próximos passos." />
    <AccountCard />
    <SubscriptionCard />
    <View style={ui.card}>
      <Text style={ui.heading}>Aparência</Text>
      <Text style={ui.body}>Escolha as cores que acompanham sua leitura.</Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: stackOptions ? 'column' : 'row', gap: 12 }}>
        {(['light', 'dark'] as const).map(mode => <Pressable key={mode} accessibilityRole="radio" aria-checked={theme.mode === mode} accessibilityState={{ checked: theme.mode === mode, disabled: !theme.ready || theme.busy }} disabled={!theme.ready || theme.busy}
          onPress={() => void theme.setMode(mode)} style={({ pressed }) => [ui.card, { flex: stackOptions ? undefined : 1, padding: 14, borderColor: theme.mode === mode ? p.accent : p.border, backgroundColor: theme.mode === mode ? p.accentSurface : p.surface }, pressed && ui.pressed, theme.busy && { opacity: 0.5 }]}>
          <Text style={ui.cardTitle}>{mode === 'light' ? '☀ Claro' : '☾ Escuro'}</Text>
          <Text style={ui.body}>{mode === 'light' ? 'Verde sálvia' : 'Azul e ciano'}</Text>
        </Pressable>)}
      </View>
      {!!theme.error && <Text accessibilityRole="alert" style={{ color: p.danger }}>{theme.error}</Text>}
    </View>
    <FeatureLink title="Sua leitura" description="Tamanho, espaçamento e conforto para ler." icon="text-outline" href="/reading-settings" />
    <FeatureLink title="Meus dados" description="Guarde e restaure sua jornada." icon="shield-checkmark-outline" href="/my-data" violet />
    <View style={{ gap: 14 }}>
      <Text style={ui.heading}>Continue sua jornada</Text>
      <FeatureLink title="Planos de leitura" description="Seu ritmo, suas etapas e seu progresso." icon="checkmark-circle-outline" href="/reading-plans" violet />
      <FeatureLink title="Histórico de leitura" description="Retome seus capítulos mais recentes." icon="time-outline" href="/reading-history" />
      <FeatureLink title="Meus favoritos" description="Palavras para guardar e revisitar." icon="heart-outline" href="/favorites" />
      <FeatureLink title="Minhas anotações" description="Suas reflexões sobre a Palavra." icon="create-outline" href="/notes" violet />
      <FeatureLink title="Minha agenda" description="Compromissos e lembretes." icon="calendar-outline" href="/agenda" />
      <FeatureLink title="Apoio ministerial" description="Prepare mensagens com propósito." icon="mic-outline" href="/support" violet />
      <FeatureLink title="Mentorias e Pregações" description="Sua biblioteca de aulas e mensagens em vídeo e áudio." icon="play-circle-outline" href="/premium-library" violet />
      <FeatureLink title="Explorar a Bíblia" description="Encontre seu próximo capítulo." icon="book-outline" href="/bible" />
    </View>
    <View style={ui.card}>
      <Text style={ui.heading}>Mais espaço para sua fé</Text>
      <Text style={ui.body}>A sincronização entre aparelhos está em preparação para acompanhar sua jornada.</Text>
      <Text style={[ui.eyebrow, { color: p.violet }]}>PRÓXIMAS ETAPAS</Text>
    </View>
  </ScreenFrame>;
}
