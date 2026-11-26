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
export function ScreenFrame({ children, compactTop = false }: PropsWithChildren<{ compactTop?: boolean }>) {
  const ui = useUi();
  const subscription = useSubscription();
  return <SafeAreaView edges={subscription.mode === 'preview' ? ['left', 'right'] : ['top', 'left', 'right']} style={ui.safe}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={[ui.container, compactTop && { paddingTop: 6 }]}>
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
    <Ionicons name={name} size={20} color={violet ? p.violet : p.accent} />
  </View>;
}
export function OrbitCard({ children, violet = false }: PropsWithChildren<{ violet?: boolean }>) {
  const { palette: p, gradients } = useAppTheme();
  const ui = useUi();
  return <LinearGradient colors={violet ? gradients.violet : gradients.primary}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[ui.hero, violet && { borderColor: p.violetBorder }]}>
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={ui.orbit}><View style={ui.innerOrbit} /></View>
    <View style={{ gap: 12 }}>{children}</View>
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
  container: { padding: 16, paddingBottom: 24, gap: 14, width: '100%', maxWidth: 680, alignSelf: 'center' },
  title: { color: p.text, fontSize: 24, lineHeight: 31, fontWeight: '700', letterSpacing: -0.8 },
  eyebrow: { color: p.accent, fontSize: 11, lineHeight: 17, letterSpacing: 1.4, fontWeight: '700' },
  heading: { color: p.text, fontSize: 18, lineHeight: 25, fontWeight: '700', letterSpacing: -0.4 },
  cardTitle: { color: p.text, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  body: { color: p.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, borderRadius: 16, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, borderColor: p.accentBorder, backgroundColor: p.accentSurface, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 20, padding: 16, borderWidth: 1, borderColor: p.accentBorder, overflow: 'hidden' },
  orbit: { pointerEvents: 'none', position: 'absolute', width: 180, height: 180, borderRadius: 36, borderWidth: 1, borderColor: p.accentBorder, opacity: 0.15, transform: [{ rotate: '32deg' }], top: -110, right: -95, alignItems: 'center', justifyContent: 'center' },
  innerOrbit: { width: 136, height: 136, borderRadius: 25, borderWidth: 1, borderColor: p.accentBorder },
  button: { backgroundColor: p.accent, minHeight: 44, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { color: p.ink, fontSize: 14, lineHeight: 20, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  pressed: { opacity: 0.72 },
  pill: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, backgroundColor: p.violetSurface, borderRadius: 12, borderWidth: 1, borderColor: p.violetBorder },
  pillText: { color: p.violet, fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
}); }

export function useUi() { const { palette } = useAppTheme(); return createStyles(palette); }
