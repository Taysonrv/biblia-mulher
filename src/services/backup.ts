import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBackupRepository } from './backup-repository';
import { localData } from './local-data';
export const backupRepository = createBackupRepository(AsyncStorage, localData);
