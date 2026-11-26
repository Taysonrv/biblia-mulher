import { createBibleSpeech } from './bible-speech-model';

// Lazy import lets an older development APK show an actionable message instead of crashing the reader.
export const bibleSpeech = createBibleSpeech(async () => {
  const speech = await import('expo-speech');
  return { maxSpeechInputLength: speech.maxSpeechInputLength, getAvailableVoicesAsync: speech.getAvailableVoicesAsync,
    stop: speech.stop, speak: (text, options) => speech.speak(text, options) };
});
