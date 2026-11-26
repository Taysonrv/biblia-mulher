import AsyncStorage from '@react-native-async-storage/async-storage';
import { createReportsRepository } from './reading-reports-model';
export const readingReports = createReportsRepository(AsyncStorage);
