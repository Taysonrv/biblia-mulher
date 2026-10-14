import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { contentFileKind } from './content-file-model';
export async function pickContentFile() {
  const result = await DocumentPicker.getDocumentAsync({ type: ['video/mp4', 'video/quicktime', 'video/x-m4v', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav'], multiple: false, copyToCacheDirectory: true, base64: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  try { return { uri: asset.uri, media: contentFileKind(asset), name: asset.name }; }
  catch (reason) { releaseContentFile(asset.uri); throw reason; }
}
export function releaseContentFile(uri: string) { if (Platform.OS === 'web' && uri.startsWith('blob:')) URL.revokeObjectURL(uri); }
