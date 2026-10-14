import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPlanRepository } from './reading-plan-repository';
import { localData } from './local-data';
export const planRepository = localData.wrap(createPlanRepository(AsyncStorage));
