import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPersonalStudyRepository } from './personal-studies-repository';
import { localData } from './local-data';
export const personalStudies = localData.wrap(createPersonalStudyRepository(AsyncStorage));
