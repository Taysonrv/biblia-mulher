import type { SubscriptionAdapter } from './subscription-access';

// Replace only after connecting store purchases and trusted receipt validation.
// Unconfigured builds always start free; there is no purchase or fake restore.
export const subscriptionAdapter: SubscriptionAdapter = {
  configured: false,
  async read() { return null; },
};
