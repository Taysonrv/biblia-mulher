import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FeatureLink, IconBadge, OrbitCard, PremiumBadge, ScreenFrame, useUi } from '@/components/modern-ui';
import { SubscriptionCard } from '@/components/subscription-card';
import { useAppTheme } from '@/components/app-theme';
import { PlanResume } from '@/components/plan-resume';
import { ReadingResume } from '@/components/reading-resume';
import type { Palette } from '@/constants/design';

const shortcuts: { title: string; subtitle: string; icon: 'book-outline' | 'layers-outline' | 'calendar-outline' | 'mic-outline'; href: Href; violet?: boolean }[] = [
  { title: 'Bíblia', subtitle: 'Leia e medite', icon: 'book-outline', href: '/bible' },
  { title: 'Estudos', subtitle: 'Aprofunde sua fé', icon: 'layers-outline', href: '/studies', violet: true },
  { title: 'Agenda', subtitle: 'Organize sua jornada', icon: 'calendar-outline', href: '/agenda', violet: true },
  { title: 'Apoio ministerial', subtitle: 'Ferramentas Premium', icon: 'mic-outline', href: '/support' },
];
export default function HomeScreen() {
  const { palette: p } = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const styles = createStyles(p, width < 360, fontScale > 1.3);
  const ui = useUi();
  return <ScreenFrame>
    <View style={styles.header}>
      <View style={[ui.row, { flex: 1, minWidth: 0 }]}><IconBadge name="book-outline" /><View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.brand}>Bíblia Smart</Text><Text style={styles.brandSubtitle}>FÉ PARA A VIDA</Text>
      </View></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir meu perfil" style={({ pressed }) => [styles.profile, pressed && ui.pressed]} onPress={() => router.push('/profile')}>
        <Ionicons name="person-outline" size={21} color={p.text} />
      </Pressable>
    </View>
    <View style={{ gap: 8 }}>
      <Text style={ui.eyebrow}>UM NOVO MOMENTO COM DEUS</Text>
      <Text accessibilityRole="header" style={styles.welcome}>Sua fé. Seu caminho.</Text>
      <Text style={ui.body}>Um espaço para ler, refletir e viver a Palavra.</Text>
    </View>
    <ReadingResume />
    <PlanResume />
    <SubscriptionCard />
    <OrbitCard>
      <View style={styles.labelRow}><Text style={ui.eyebrow}>PALAVRA PARA HOJE</Text><Ionicons name="sparkles-outline" size={20} color={p.accent} /></View>
      <Text selectable style={styles.verse}>Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.</Text>
      <Text style={styles.reference}>Eclesiastes 3:1</Text>
      <Pressable accessibilityRole="button" style={({ pressed }) => [ui.button, pressed && ui.pressed]}
        onPress={() => router.push({ pathname: '/chapter', params: { book: 'Eclesiastes', chapter: '3' } })}>
        <Text style={ui.buttonText}>Explorar capítulo</Text><Ionicons name="arrow-forward" size={18} color={p.ink} />
      </Pressable>
    </OrbitCard>
    <View style={{ gap: 14 }}>
      <Text style={ui.heading}>Sua jornada, em um só lugar</Text>
      <View style={styles.grid}>{shortcuts.map(shortcut => <Pressable key={shortcut.title}
        accessibilityRole="button" accessibilityLabel={shortcut.title + ". " + shortcut.subtitle} onPress={() => router.push(shortcut.href)}
        style={({ pressed }) => [ui.card, styles.shortcut, pressed && ui.pressed]}>
        <IconBadge name={shortcut.icon} violet={shortcut.violet} />
        <Text style={ui.cardTitle}>{shortcut.title}</Text>
        {shortcut.title === 'Apoio ministerial' && <PremiumBadge />}
        <Text style={styles.shortcutSubtitle}>{shortcut.subtitle}</Text>
      </Pressable>)}</View>
    </View>
    <FeatureLink title="Mentorias e Pregações" description="Aulas e mensagens em vídeo e áudio para aprofundar sua jornada." icon="play-circle-outline" href="/premium-library" violet />
    <OrbitCard violet>
      <View style={ui.pill}><Text style={ui.pillText}>APOIO MINISTERIAL</Text></View><PremiumBadge />
      <Text style={ui.heading}>Uma mensagem com propósito.</Text>
      <Text style={ui.body}>Transforme seu tema em um roteiro de estudo, com referências e perguntas para reflexão.</Text>
      <Pressable accessibilityRole="button" style={({ pressed }) => [styles.outlineButton, pressed && ui.pressed]} onPress={() => router.push('/support')}>
        <Text style={styles.outlineText}>Preparar minha mensagem</Text><Ionicons name="arrow-forward" color={p.violet} size={18} />
      </Pressable>
    </OrbitCard>
    <View style={{ gap: 14 }}>
      <Text style={ui.heading}>Uma leitura para hoje</Text>
      <Pressable accessibilityRole="button" style={({ pressed }) => [ui.card, ui.row, pressed && ui.pressed]}
        onPress={() => router.push({ pathname: '/chapter', params: { book: 'Salmos', chapter: '23' } })}>
        <IconBadge name="bookmark-outline" />
        <View style={{ flex: 1, gap: 4 }}><Text style={ui.cardTitle}>O cuidado do Pastor</Text><Text style={ui.body}>Salmos • Capítulo 23</Text></View>
        <Ionicons name="chevron-forward" size={20} color={p.accent} />
      </Pressable>
    </View>
    <View style={[ui.card, { borderLeftColor: p.violet, borderLeftWidth: 3 }]}>
      <Text style={[ui.eyebrow, { color: p.violet }]}>MOMENTO DE REFLEXÃO</Text>
      <Text style={ui.heading}>Há propósito no tempo de espera.</Text>
      <Text style={ui.body}>Nem sempre percebemos o que Deus está fazendo. Reserve um momento para refletir sobre sua caminhada e apresentar a Ele suas preocupações.</Text>
    </View>
    <Text style={styles.footer}>A Palavra acompanha cada jornada.</Text>
  </ScreenFrame>;
}
function createStyles(p: Palette, narrow: boolean, largeText: boolean) { return StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  brand: { color: p.text, fontSize: narrow ? 20 : 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.6 },
  brandSubtitle: { color: p.subtle, fontSize: 9, fontWeight: '700', letterSpacing: 2, marginTop: 3 },
  profile: { width: 46, height: 46, borderRadius: 17, backgroundColor: p.surfaceRaised, borderWidth: 1, borderColor: p.border, alignItems: 'center', justifyContent: 'center' },
  welcome: { color: p.text, fontSize: narrow ? 24 : 26, lineHeight: 34, letterSpacing: -0.6, fontWeight: '700' },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  verse: { color: p.text, fontSize: 20, lineHeight: 30, letterSpacing: -0.2, fontWeight: '500' },
  reference: { color: p.accent, fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  shortcut: { width: largeText ? '100%' : '48%', padding: 16, gap: 9 },
  shortcutSubtitle: { color: p.muted, fontSize: 13, lineHeight: 19 },
  outlineButton: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: p.violetBorder, backgroundColor: p.violetSurface, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  outlineText: { color: p.violet, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  footer: { color: p.subtle, textAlign: 'center', fontSize: 12, lineHeight: 19 },
}); }
