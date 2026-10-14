import AsyncStorage from '@react-native-async-storage/async-storage';
import { localData } from './local-data';
import { createSermonRepository } from './sermon-repository';
export const savedSermons = localData.wrap(createSermonRepository(AsyncStorage));
