import * as DocumentPicker from 'expo-document-picker';
import { checkBackupSize, MAX_BACKUP_BYTES } from './backup-repository';

// Browser counterpart. Metro uses backup-files.native.ts on Android and iOS.
export async function selectBackupFile(): Promise<{ name: string; text: string } | null> {
  const selected = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false });
  if (selected.canceled) return null;
  const asset = selected.assets[0];
  if (!asset.file) throw Error('Não foi possível ler o arquivo selecionado.');
  if (asset.file.size > MAX_BACKUP_BYTES) throw Error('Escolha um backup de até 8 MB.');
  const text = await asset.file.text(); checkBackupSize(text); return { name: asset.name, text };
}
export async function saveBackupFile(text: string, name: string): Promise<'shared' | 'download'> {
  checkBackupSize(text);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  try {
    const link = document.createElement('a'); link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
  } finally { setTimeout(() => URL.revokeObjectURL(url), 60_000); }
  return 'download';
}
