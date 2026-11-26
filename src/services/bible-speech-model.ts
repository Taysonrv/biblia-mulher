export interface DeviceVoice { identifier: string; name: string; language: string }
export interface SpeechCallbacks { language: string; voice?: string; rate: number; onStart(): void; onDone(): void; onStopped(): void; onError(): void }
export interface SpeechEngine { maxSpeechInputLength: number; getAvailableVoicesAsync(): Promise<DeviceVoice[]>; speak(text: string, options: SpeechCallbacks): void; stop(): Promise<void> }
export interface BibleSpeechState {
  book: string; chapter: number; verse: number; status: 'idle' | 'loading' | 'speaking' | 'paused' | 'finished' | 'error';
  rate: number; voice: string; voices: DeviceVoice[]; error: string;
}
export function speechChunks(text: string, limit: number): string[] {
  const size = Math.min(3000, Math.floor(limit));
  if (!Number.isFinite(size) || size < 2) throw Error('O serviço de voz não informou um limite válido.');
  const chunks: string[] = []; let remaining = text.trim();
  while (remaining.length > size) {
    let end = remaining.lastIndexOf(' ', size);
    if (end <= 0) end = size;
    if (/[\uD800-\uDBFF]/.test(remaining[end - 1])) end--;
    chunks.push(remaining.slice(0, end).trim()); remaining = remaining.slice(end).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
export function createBibleSpeech(load: () => Promise<SpeechEngine>) {
  let state: BibleSpeechState = { book: '', chapter: 0, verse: 1, status: 'idle', rate: 1, voice: '', voices: [], error: '' };
  let verses: readonly string[] = []; let epoch = 0; let utterance = 0; let chunks: string[] = []; let chunk = 0;
  let engine: SpeechEngine | null = null; let queue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  function update(patch: Partial<BibleSpeechState>) { state = { ...state, ...patch }; listeners.forEach(listener => listener()); }
  function run(operation: () => Promise<void> | void) {
    const task = queue.then(operation); queue = task.catch(() => undefined); return task;
  }
  function fail(message = 'Não foi possível iniciar a voz. Confira o volume e as vozes em português do aparelho e tente novamente.') { update({ status: 'error', error: message }); }
  async function getEngine() {
    if (!engine) {
      try { engine = await load(); }
      catch { throw Error('A voz não está disponível nesta instalação. Instale o novo APK com Bíblia falada e tente novamente.'); }
    }
    return engine;
  }
  async function voicesFor(engine: SpeechEngine) {
    const voices = (await engine.getAvailableVoicesAsync()).filter(voice => /^pt(?:-|_|$)/i.test(voice.language));
    voices.sort((a, b) => Number(/^pt[-_]BR$/i.test(b.language)) - Number(/^pt[-_]BR$/i.test(a.language)) || a.name.localeCompare(b.name));
    return voices.filter((voice, index) => voices.findIndex(item => item.identifier === voice.identifier) === index);
  }
  function speak(token: number) {
    if (token !== epoch || !engine) return;
    const ticket = ++utterance;
    if (!chunks.length) { chunks = speechChunks(verses[state.verse - 1], engine.maxSpeechInputLength); chunk = 0; }
    if (!chunks.length) { fail(); return; }
    const active = () => token === epoch && ticket === utterance;
    const voice = state.voices.find(item => item.identifier === state.voice);
    try {
      engine.speak(chunks[chunk], { language: voice?.language ?? 'pt-BR', ...(voice ? { voice: voice.identifier } : {}), rate: state.rate,
        onStart() { if (active()) update({ status: 'speaking', error: '' }); },
        onDone() {
          if (!active()) return;
          // Invalidate duplicate callbacks before scheduling another utterance.
          utterance++;
          if (chunk + 1 < chunks.length) chunk++;
          else if (state.verse < verses.length) { update({ verse: state.verse + 1 }); chunks = []; chunk = 0; }
          else { update({ status: 'finished', error: '' }); return; }
          void run(() => speak(token)).catch(() => { if (token === epoch) fail(); });
        },
        onStopped() { if (active()) { epoch++; chunks = []; update({ status: 'paused' }); } },
        onError() { if (active()) { epoch++; chunks = []; fail(); } },
      });
    } catch { if (active()) { epoch++; chunks = []; fail(); } }
  }
  const controller = {
    current: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    setChapter(book: string, chapter: number, text: readonly string[]) {
      if (state.book === book && state.chapter === chapter && verses === text) return Promise.resolve();
      epoch++; chunks = []; verses = text;
      update({ book, chapter, verse: 1, status: 'idle', error: '' });
      return run(async () => { if (engine) { try { await engine.stop(); } catch { fail('Não foi possível parar a voz anterior. Tente parar a leitura novamente.'); } } });
    },
    play(start = state.status === 'paused' || state.status === 'error' ? state.verse : 1) {
      if (!Number.isInteger(start) || start < 1 || start > verses.length) return Promise.resolve();
      const token = ++epoch; chunks = []; chunk = 0;
      update({ verse: start, status: 'loading', error: '' });
      return run(async () => {
        try {
          if (token !== epoch) return;
          const sdk = await getEngine(); if (token !== epoch) return;
          await sdk.stop(); if (token !== epoch) return;
          const voices = await voicesFor(sdk); if (token !== epoch) return;
          if (!voices.length) throw Error('Nenhuma voz em português disponível. Instale ou ative uma voz em português nas configurações de conversão de texto em fala do aparelho e tente novamente.');
          update({ voices, voice: voices.some(voice => voice.identifier === state.voice) ? state.voice : voices[0].identifier });
          speak(token);
        } catch (reason) { if (token === epoch) fail(reason instanceof Error ? reason.message : undefined); }
      });
    },
    pause() {
      epoch++; chunks = []; update({ status: state.status === 'finished' || state.status === 'idle' ? state.status : 'paused' });
      return run(async () => { if (engine) { try { await engine.stop(); } catch { fail('Não foi possível parar a voz. Tente novamente.'); } } });
    },
    stop() {
      epoch++; chunks = []; update({ verse: 1, status: 'idle', error: '' });
      return run(async () => { if (engine) { try { await engine.stop(); } catch { fail('Não foi possível parar a voz. Tente novamente.'); } } });
    },
    async loadVoices() {
      const token = epoch;
      try {
        const sdk = await getEngine(); const voices = await voicesFor(sdk);
        if (token === epoch) update({ voices, voice: voices.some(item => item.identifier === state.voice) ? state.voice : voices[0]?.identifier ?? '' });
      }
      catch (reason) { if (token === epoch) update({ error: reason instanceof Error ? reason.message : 'Não foi possível buscar as vozes. Tente novamente.' }); }
    },
    setRate(rate: number) {
      if (![0.75, 1, 1.25].includes(rate)) return;
      if (state.status === 'speaking' || state.status === 'loading') void controller.pause();
      update({ rate });
    },
    setVoice(identifier: string) {
      if (!state.voices.some(voice => voice.identifier === identifier)) return;
      if (state.status === 'speaking' || state.status === 'loading') void controller.pause();
      update({ voice: identifier });
    },
  };
  return controller;
}
