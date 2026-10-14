import { ReaderPreferencesProvider } from '@/components/reader-preferences-provider';
import { AccountProvider } from '@/components/account-provider';
import { SubscriptionProvider, useSubscription } from '@/components/subscription-provider';
import { ContentProvider } from '@/components/content-provider';
import { ContentJourneyProvider } from '@/components/content-journey-provider';
import { Pressable, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppThemeProvider, useAppTheme } from '@/components/app-theme';
import { useAgendaNotifications } from '@/hooks/use-agenda-notifications';
import { Tabs, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

function AppNavigator() {
  const { palette: p, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const subscription = useSubscription();
  useAgendaNotifications();

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {subscription.mode === 'preview' && <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: p.violetSurface }}>
        <Pressable accessibilityRole="button" accessibilityLabel={subscription.testAccess ? 'Premium liberado para testes, sem cobrança. Ver detalhes' : 'Simulação Premium, sem cobrança. Gerenciar simulação'} onPress={() => router.push('/subscription')}
          style={{ paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: p.violet, fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'center' }}>{subscription.testAccess ? 'PREMIUM LIBERADO PARA TESTES • SEM COBRANÇA' : 'SIMULAÇÃO PREMIUM • SEM COBRANÇA'}</Text>
        </Pressable>
      </SafeAreaView>}
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: p.background },
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: p.accent,
        tabBarActiveBackgroundColor: p.accentSurface,
        tabBarInactiveTintColor: p.subtle,

        tabBarStyle: {
          height: 70 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 7),
          backgroundColor: p.background,
          borderTopColor: p.border,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 16,
          flexShrink: 0,
          fontWeight: '600',
        },

        tabBarItemStyle: {
          paddingVertical: 0,
          borderRadius: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarAccessibilityLabel: 'Início',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="bible"
        options={{
          title: 'Bíblia',
          tabBarAccessibilityLabel: 'Bíblia',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "book" : "book-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="studies"
        options={{
          title: 'Estudos',
          tabBarAccessibilityLabel: 'Estudos',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "library" : "library-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarAccessibilityLabel: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="book" options={{ href: null }} />
      <Tabs.Screen name="chapter" options={{ href: null }} />
      <Tabs.Screen name="reading-plans" options={{ href: null }} />
      <Tabs.Screen name="reading-plan" options={{ href: null }} />
      <Tabs.Screen name="reading-plan-day" options={{ href: null }} />
      <Tabs.Screen name="reading-settings" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="subscription" options={{ href: null }} />
      <Tabs.Screen name="premium-library" options={{ href: null }} />
      <Tabs.Screen name="mentorships" options={{ href: null }} />
      <Tabs.Screen name="preachings" options={{ href: null }} />
      <Tabs.Screen name="premium-content" options={{ href: null }} />
      <Tabs.Screen name="content-watch" options={{ href: null }} />
      <Tabs.Screen name="content-studio" options={{ href: null }} />
      <Tabs.Screen name="my-data" options={{ href: null }} />
      <Tabs.Screen name="reading-search" options={{ href: null }} />
      <Tabs.Screen name="reading-history" options={{ href: null }} />
      <Tabs.Screen name="reading-picker" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="sermon-builder" options={{ href: null }} />
      <Tabs.Screen name="sermon-outline" options={{ href: null }} />
      <Tabs.Screen name="sermons" options={{ href: null }} />
      <Tabs.Screen name="sermon-editor" options={{ href: null }} />
      <Tabs.Screen name="sermon-presenter" options={{ href: null, ...(subscription.hasPremium ? { tabBarStyle: { display: 'none' as const } } : {}) }} />
      <Tabs.Screen name="agenda" options={{ href: null }} />
      <Tabs.Screen name="agenda-event" options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="notes" options={{ href: null }} />
      <Tabs.Screen name="verse-note" options={{ href: null }} />
      <Tabs.Screen name="book-studies" options={{ href: null }} />
      <Tabs.Screen name="study-search" options={{ href: null }} />
      <Tabs.Screen name="my-studies" options={{ href: null }} />
      <Tabs.Screen name="study-note" options={{ href: null }} />
      <Tabs.Screen name="book-study" options={{ href: null }} />
      <Tabs.Screen name="word-studies" options={{ href: null }} />
      <Tabs.Screen name="word-study" options={{ href: null }} />
    </Tabs>
    </>
  );
}
export default function RootLayout() { return <AppThemeProvider><ReaderPreferencesProvider><AccountProvider><SubscriptionProvider><ContentProvider><ContentJourneyProvider><AppNavigator /></ContentJourneyProvider></ContentProvider></SubscriptionProvider></AccountProvider></ReaderPreferencesProvider></AppThemeProvider>; }
