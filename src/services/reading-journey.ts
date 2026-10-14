import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJourneyRepository } from './reading-journey-repository';
export const readingJourney = createJourneyRepository(AsyncStorage);
