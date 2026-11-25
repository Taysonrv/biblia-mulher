import { useCallback, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { bibleSpeech } from '@/services/bible-speech';

export function useBibleSpeech(book: string, chapter: number, verses: readonly string[] | null) {
  const state = useSyncExternalStore(bibleSpeech.subscribe, bibleSpeech.current, bibleSpeech.current);
  useFocusEffect(useCallback(() => {
    void bibleSpeech.setChapter(book, chapter, verses ?? []);
    const subscription = AppState.addEventListener('change', next => { if (next !== 'active') void bibleSpeech.pause(); });
    return () => { subscription.remove(); void bibleSpeech.pause(); };
  }, [book, chapter, verses]));
  return { ...state, matches: state.book === book && state.chapter === chapter, play: bibleSpeech.play, pause: bibleSpeech.pause,
    stop: bibleSpeech.stop, setRate: bibleSpeech.setRate, setVoice: bibleSpeech.setVoice, loadVoices: bibleSpeech.loadVoices };
}
