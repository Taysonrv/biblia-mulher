import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import { useAccount } from './account-provider';
import { subscriptionAdapter } from '@/services/subscription';
import { canUsePremium, createSubscriptionController, type SubscriptionState } from '@/services/subscription-access';

interface SubscriptionContextValue extends SubscriptionState {
  configured: boolean;
  hasPremium: boolean;
  setPreview: (enabled: boolean) => void;
  refresh: () => void;
  current: () => SubscriptionState;
}
const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);
export function SubscriptionProvider({ children }: PropsWithChildren) {
  const account = useAccount(); const owner = account.user?.uid ?? null;
  const [controller] = useState(() => createSubscriptionController(subscriptionAdapter, __DEV__, Date.now, Constants.expoConfig?.extra?.premiumTestAccess === true));
  const [state, setState] = useState(controller.current);
  useEffect(() => controller.subscribe(setState), [controller]);
  useEffect(() => { void controller.setAccount(owner); }, [controller, owner]);
  useEffect(() => {
    if (!state.expiresAt) return;
    const expiresAt = state.expiresAt; let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      timer = setTimeout(() => { controller.tick(); if (expiresAt > Date.now()) schedule(); }, Math.max(1, Math.min(2147483647, expiresAt - Date.now())));
    }
    schedule();
    return () => clearTimeout(timer);
  }, [controller, state.expiresAt]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', next => { if (next === 'active') void controller.refresh(); });
    return () => listener.remove();
  }, [controller]);
  // Deny the previous account's entitlement even before the account effect runs.
  const current = state.accountId === owner ? state : { ...state, accountId: owner, ready: state.testAccess, mode: state.testAccess ? 'preview' as const : 'free' as const, expiresAt: null, error: '' };
  return <SubscriptionContext value={{ ...current, configured: subscriptionAdapter.configured,
    hasPremium: canUsePremium(current.mode), setPreview: enabled => { controller.setPreview(enabled); },
    refresh: () => { void controller.refresh(); }, current: controller.current }}>{children}</SubscriptionContext>;
}
export function useSubscription() {
  const state = useContext(SubscriptionContext);
  if (!state) throw new Error('SubscriptionProvider is required.');
  return state;
}
