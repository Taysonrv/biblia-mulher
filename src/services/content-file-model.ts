import { ContentError, type MediaKind } from './premium-content-model';
export function contentFileKind(asset: { name: string; uri: string; mimeType?: string; size?: number }): MediaKind {
  const extension = asset.name.toLowerCase().split('.').pop() ?? '';
  const video = ['mp4', 'mov', 'm4v'].includes(extension); const audio = ['mp3', 'm4a', 'aac', 'wav'].includes(extension);
  if (!video && !audio) throw new ContentError('Selecione um vídeo MP4/MOV/M4V ou um áudio MP3/M4A/AAC/WAV.');
  const kind = video ? 'video' : 'audio';
  if (asset.mimeType && asset.mimeType !== 'application/octet-stream' && !asset.mimeType.startsWith(kind + '/')) throw new ContentError('O formato do arquivo não corresponde à extensão. Selecione outra mídia.');
  const limit = (video ? 250 : 50) * 1024 * 1024;
  if (!Number.isFinite(asset.size) || !asset.size || asset.size < 0 || asset.size > limit) throw new ContentError(`Para esta prévia, escolha ${video ? 'um vídeo de até 250 MB' : 'um áudio de até 50 MB'} com tamanho conhecido.`);
  if (!/^(file:\/\/|content:\/\/|blob:)/.test(asset.uri)) throw new ContentError('Este arquivo não pode ser aberto na prévia local.');
  return kind;
}
