import type { ContentAdapter } from './premium-content-model';
// Future implementation: authenticated catalog + short-lived playback grants.
// No protected file URL, credential or uploader role is bundled in this app.
export const contentAdapter: ContentAdapter = {
  configured: false,
  async catalog() { return { version: 1, items: [] }; },
  async authorizePlayback() { throw new Error('A biblioteca está em preparação.'); },
};
