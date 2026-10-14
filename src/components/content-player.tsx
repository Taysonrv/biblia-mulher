import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useEvent, useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { ActionButton } from './ui-controls';
import { IconBadge, useUi } from './modern-ui';
import { useAppTheme } from './app-theme';
import { formatMediaTime, type PlaybackGrant } from '@/services/premium-content-model';
import { resumePlaybackSeconds } from '@/services/content-journey-model';

interface PlayerProps { grant: PlaybackGrant; retry(): void; savedSeconds: number; onPosition(seconds: number, duration: number): Promise<void> }
function usePlaybackCheckpoint(player: { pause(): void; readonly currentTime: number; readonly duration: number; readonly playing: boolean }, onPosition: PlayerProps['onPosition']) {
  const active = useRef(false); const touched = useRef(false);
  const save = useCallback((seconds?: number) => {
    try {
      const duration = player.duration; const time = seconds ?? player.currentTime;
      if (touched.current && Number.isFinite(time) && time >= 0 && Number.isFinite(duration) && duration > 0 && duration <= 86400) void onPosition(Math.min(time, duration), duration);
    } catch { /* The native player may already be released during teardown. */ }
  }, [player, onPosition]);
  const touch = useCallback(() => { touched.current = true; }, []);
  useFocusEffect(useCallback(() => {
    active.current = AppState.currentState !== 'background';
    const pause = () => { save(); try { player.pause(); } catch { /* Released player. */ } };
    const listener = AppState.addEventListener('change', state => { active.current = state === 'active'; if (!active.current) pause(); });
    const timer = setInterval(() => { if (active.current) { try { if (player.playing) save(); } catch { /* Released player. */ } } }, 5000);
    return () => { active.current = false; clearInterval(timer); listener.remove(); pause(); };
  }, [player, save]));
  return { active, touch, save };
}
function VideoContentPlayer({ grant, retry, savedSeconds, onPosition }: PlayerProps) {
  const ui = useUi(); const { palette: p } = useAppTheme(); const [error, setError] = useState('');
  const [initialSeconds] = useState(savedSeconds); const [started, setStarted] = useState(false);
  const player = useVideoPlayer({ uri: grant.uri, contentType: grant.contentType, useCaching: false }, value => { value.loop = false; value.staysActiveInBackground = false; });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const checkpoint = usePlaybackCheckpoint(player, onPosition);
  useEventListener(player, 'playingChange', event => { if (event.isPlaying) { checkpoint.touch(); setStarted(true); } else checkpoint.save(); });
  const failed = status === 'error' || !!error;
  const resumeTime = resumePlaybackSeconds(initialSeconds, player.duration);
  return <View style={ui.card}>
    <VideoView accessibilityLabel="Vídeo do conteúdo Premium" player={player} nativeControls={started || !initialSeconds} contentFit="contain" fullscreenOptions={{ enable: true }} style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 12 }} />
    {status === 'loading' && <ActivityIndicator accessibilityLabel="Carregando vídeo" color={p.accent} />}
    {!started && resumeTime > 0 && <Text style={ui.body}>Ponto salvo: {formatMediaTime(resumeTime)}. Toque em retomar para continuar.</Text>}
    {!started && initialSeconds > 0 && !resumeTime && player.duration > 0 && <Text style={ui.body}>Você chegou ao final desta parte. Pode reproduzir novamente do início.</Text>}
    {!failed && <><ActionButton label={isPlaying ? 'Pausar vídeo' : !started && resumeTime > 0 ? `Retomar vídeo de ${formatMediaTime(resumeTime)}` : 'Reproduzir vídeo'} disabled={status !== 'readyToPlay'} onPress={() => {
      try {
        if (isPlaying) { player.pause(); checkpoint.save(); return; }
        if (!checkpoint.active.current) return;
        if (!started && initialSeconds > 0) player.seekBy(resumePlaybackSeconds(initialSeconds, player.duration) - player.currentTime);
        else if (player.duration && player.currentTime >= player.duration - 0.1) player.replay();
        checkpoint.touch(); setStarted(true); player.play();
      } catch { setError('Não foi possível reproduzir.'); }
    }} /><ActionButton secondary label="Começar vídeo do início" disabled={status !== 'readyToPlay'} onPress={() => { try { player.pause(); player.replay(); checkpoint.touch(); setStarted(true); checkpoint.save(0); } catch { setError('Não foi possível reiniciar.'); } }} /></>}
    {failed && <><Text accessibilityRole="alert" style={ui.body}>Não foi possível reproduzir o vídeo. Confira sua conexão e o formato do arquivo.</Text><ActionButton secondary label="Tentar abrir vídeo novamente" onPress={retry} /></>}
    <Text style={ui.body}>Use os controles do vídeo para avançar, ajustar o volume ou abrir em tela cheia.</Text>
  </View>;
}
function AudioContentPlayer({ grant, retry, savedSeconds, onPosition }: PlayerProps) {
  const ui = useUi(); const { palette: p } = useAppTheme(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [initialSeconds] = useState(savedSeconds); const [started, setStarted] = useState(false); const playingBefore = useRef(false);
  const player = useAudioPlayer({ uri: grant.uri }); const status = useAudioPlayerStatus(player);
  const checkpoint = usePlaybackCheckpoint(player, onPosition);
  useEventListener(player, 'playbackStatusUpdate', event => {
    if (event.playing) checkpoint.touch();
    else if (playingBefore.current) checkpoint.save();
    playingBefore.current = event.playing;
  });
  async function act(operation: () => Promise<void> | void) { if (busy) return; setBusy(true); try { await operation(); } catch { setError('Não foi possível reproduzir.'); } finally { setBusy(false); } }
  const failed = !!error || !!status.error;
  const resumeTime = resumePlaybackSeconds(initialSeconds, status.duration);
  const progress = status.duration > 0 ? Math.max(0, Math.min(100, status.currentTime / status.duration * 100)) : 0;
  return <View style={ui.card}>
    <IconBadge name="headset-outline" violet /><Text style={ui.heading}>Ouça no seu tempo.</Text>
    {!status.isLoaded && !failed && <ActivityIndicator accessibilityLabel="Carregando áudio" color={p.accent} />}
    <View accessibilityRole="progressbar" accessibilityLabel="Progresso do áudio" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }} style={{ height: 8, borderRadius: 4, backgroundColor: p.border }}><View style={{ width: `${progress}%`, height: 8, borderRadius: 4, backgroundColor: p.accent }} /></View>
    <Text style={ui.body}>{formatMediaTime(status.currentTime)} / {formatMediaTime(status.duration)}</Text>
    {!started && resumeTime > 0 && <Text style={ui.body}>Ponto salvo: {formatMediaTime(resumeTime)}. Toque em retomar para continuar.</Text>}
    {!started && initialSeconds > 0 && !resumeTime && status.duration > 0 && <Text style={ui.body}>Você chegou ao final desta parte. Pode reproduzir novamente do início.</Text>}
    {!failed && <>
      <ActionButton label={status.playing ? 'Pausar áudio' : !started && resumeTime > 0 ? `Retomar áudio de ${formatMediaTime(resumeTime)}` : 'Reproduzir áudio'} disabled={!status.isLoaded || busy || (!started && initialSeconds > 0 && !status.duration)} busy={busy} onPress={() => void act(async () => {
        if (status.playing) { player.pause(); checkpoint.save(); return; }
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, allowsRecording: false });
        if (!checkpoint.active.current) return;
        if (!started && initialSeconds > 0) await player.seekTo(resumePlaybackSeconds(initialSeconds, player.duration));
        else if (player.duration && player.currentTime >= player.duration - 0.1) await player.seekTo(0);
        if (checkpoint.active.current) { checkpoint.touch(); setStarted(true); player.play(); }
      })} />
      <ActionButton secondary label="Começar áudio do início" disabled={!status.isLoaded || busy} onPress={() => void act(async () => { player.pause(); await player.seekTo(0); if (checkpoint.active.current) { checkpoint.touch(); setStarted(true); checkpoint.save(0); } })} />
      <ActionButton secondary label="Voltar 15 segundos" disabled={!status.isLoaded || busy} onPress={() => void act(async () => { await player.seekTo(Math.max(0, player.currentTime - 15)); if (checkpoint.active.current) { checkpoint.touch(); setStarted(true); checkpoint.save(); } })} />
      <ActionButton secondary label="Avançar 15 segundos" disabled={!status.isLoaded || !status.duration || busy} onPress={() => void act(async () => { await player.seekTo(Math.min(player.duration, player.currentTime + 15)); if (checkpoint.active.current) { checkpoint.touch(); setStarted(true); checkpoint.save(); } })} />
    </>}
    {failed && <><Text accessibilityRole="alert" style={ui.body}>Não foi possível reproduzir o áudio. Confira sua conexão e o formato do arquivo.</Text><ActionButton secondary label="Tentar abrir áudio novamente" onPress={retry} /></>}
    {status.isBuffering && status.isLoaded && <Text accessibilityLiveRegion="polite" style={ui.body}>Carregando mais áudio…</Text>}
  </View>;
}
export function ContentPlayer(props: PlayerProps) { return props.grant.media === 'video' ? <VideoContentPlayer {...props} /> : <AudioContentPlayer {...props} />; }
