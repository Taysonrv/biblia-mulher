import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { checkBackupSize, MAX_BACKUP_BYTES } from './backup-repository';

export async function selectBackupFile(): Promise<{ name: string; text: string } | null> {
  const selected = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
  if (selected.canceled) return null;
  const asset = selected.assets[0];
  if ((asset.size ?? 0) > MAX_BACKUP_BYTES) throw Error('Escolha um backup de até 8 MB.');
  const file = new File(asset.uri);
  if (file.size > MAX_BACKUP_BYTES) throw Error('Escolha um backup de até 8 MB.');
  const text = await file.text(); checkBackupSize(text); return { name: asset.name, text };
}
export async function saveBackupFile(text: string, name: string): Promise<'shared' | 'download'> {
  checkBackupSize(text);
  if (!await Sharing.isAvailableAsync()) throw Error('O compartilhamento de arquivos não está disponível neste aparelho.');
  const folder = new Directory(Paths.cache, 'biblia-smart-backups'); folder.create({ idempotent: true });
  const file = new File(folder, name); file.create({ overwrite: true }); file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Guardar backup da Bíblia Smart' });
  return 'shared';
}
