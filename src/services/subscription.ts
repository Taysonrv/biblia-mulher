import { billing } from './billing';
import type { SubscriptionAdapter } from './subscription-access';

// Native billing is inactive until the store and public SDK key are configured.
export const subscriptionAdapter: SubscriptionAdapter = billing;
