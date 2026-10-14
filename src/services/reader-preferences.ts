import AsyncStorage from '@react-native-async-storage/async-storage';
import { createReaderPreferencesRepository } from './reader-preferences-repository';
export const readerPreferences = createReaderPreferencesRepository(AsyncStorage);
