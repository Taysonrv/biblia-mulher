import type { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useAppTheme } from '@/components/app-theme';
import type { Palette } from '@/constants/design';
import { routePremiumFeature } from '@/services/subscription-access';
import { useSubscription } from './subscription-provider';

type IconName = ComponentProps<typeof Ionicons>['name'];
export function ScreenFrame({ children }: PropsWithChildren) {
  const ui = useUi();
  return <SafeAreaView edges={['top', 'left', 'right']} style={ui.safe}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={ui.container}>
      {children}
    </ScrollView>
  </SafeAreaView>;
}
export function ScreenHeading({ title, subtitle, eyebrow }: { title: string; subtitle: string; eyebrow?: string }) {
  const ui = useUi();
  return <View style={{ gap: 10 }}>
    {eyebrow ? <Text style={ui.eyebrow}>{eyebrow}</Text> : null}
    <Text accessibilityRole="header" style={ui.title}>{title}</Text>
    <Text style={ui.body}>{subtitle}</Text>
  </View>;
}
export function IconBadge({ name, violet = false }: { name: IconName; violet?: boolean }) {
  const { palette: p } = useAppTheme();
  const ui = useUi();
  return <View accessible={false} style={[ui.iconBadge, violet && { backgroundColor: p.violetSurface, borderColor: p.violetBorder }]}>
    <Ionicons name={name} size={23} color={violet ? p.violet : p.accent} />
  </View>;
}
export function OrbitCard({ children, violet = false }: PropsWithChildren<{ violet?: boolean }>) {
  const { palette: p, gradients } = useAppTheme();
  const ui = useUi();
  return <LinearGradient colors={violet ? gradients.violet : gradients.primary}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[ui.hero, violet && { borderColor: p.violetBorder }]}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={ui.orbit}><View style={ui.innerOrbit} /></View>
    <View style={{ gap: 16 }}>{children}</View>
  </LinearGradient>;
}
export function FeatureLink({ title, description, icon, href, violet = false }: {
  title: string; description: string; icon: IconName; href: Href; violet?: boolean;
}) {
  const { palette: p } = useAppTheme();
  const ui = useUi();
  const feature = routePremiumFeature(typeof href === 'string' ? href : href.pathname ?? '', typeof href === 'object' ? href.params : undefined);
  return <Pressable accessibilityRole="button" accessibilityLabel={title + (feature ? '. Premium' : '') + '. ' + description}
    onPress={() => router.push(href)} style={({ pressed }) => [ui.card, ui.row, pressed && ui.pressed]}>
    <IconBadge name={icon} violet={violet} />
    <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={ui.cardTitle}>{title}</Text>{feature && <PremiumBadge />}<Text style={ui.body}>{description}</Text></View>
    <Ionicons name="arrow-forward" size={20} color={p.muted} />
  </Pressable>;
}
export function PremiumBadge() {
  const state = useSubscription(); const ui = useUi();
  return <View style={ui.pill}><Text style={ui.pillText}>{state.testAccess ? 'PREMIUM • TESTE LIBERADO' : state.mode === 'preview' ? 'PREMIUM • SIMULAÇÃO' : state.hasPremium ? 'PREMIUM • LIBERADO' : 'PREMIUM'}</Text></View>;
}
function createStyles(p: Palette) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: p.background },
  container: { padding: 20, paddingBottom: 32, gap: 20, width: '100%', maxWidth: 680, alignSelf: 'center' },
  title: { color: p.text, fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  eyebrow: { color: p.accent, fontSize: 11, lineHeight: 17, letterSpacing: 1.4, fontWeight: '700' },
  heading: { color: p.text, fontSize: 20, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  cardTitle: { color: p.text, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { color: p.muted, fontSize: 15, lineHeight: 23 },
  card: { backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: 20, padding: 18, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: p.accentBorder, backgroundColor: p.accentSurface, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: p.accentBorder, overflow: 'hidden' },
  orbit: { pointerEvents: 'none', position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: 'rgba(187,166,255,0.16)', top: -90, right: -115, alignItems: 'center', justifyContent: 'center' },
  innerOrbit: { width: 160, height: 160, borderRadius: 80, borderWidth: 28, borderColor: 'rgba(104,227,213,0.035)' },
  button: { backgroundColor: p.accent, minHeight: 50, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { color: p.ink, fontSize: 15, lineHeight: 22, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  pressed: { opacity: 0.72 },
  pill: { alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 12, backgroundColor: p.violetSurface, borderRadius: 12, borderWidth: 1, borderColor: p.violetBorder },
  pillText: { color: p.violet, fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
}); }

export function useUi() { const { palette } = useAppTheme(); return createStyles(palette); }
