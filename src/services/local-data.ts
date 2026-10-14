import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDataCoordinator } from './data-coordinator';
export const localData = createDataCoordinator(AsyncStorage);
