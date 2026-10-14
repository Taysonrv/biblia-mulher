import AsyncStorage from '@react-native-async-storage/async-storage';
import { createReadingRepository } from './reading-repository';
import { localData } from './local-data';
export const readingRepository = localData.wrap(createReadingRepository(AsyncStorage));
