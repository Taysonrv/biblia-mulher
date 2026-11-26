import { readingReports } from './reading-reports';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJourneyRepository } from './reading-journey-repository';
const repository = createJourneyRepository(AsyncStorage);
export const readingJourney = {
  read: repository.read,
  async record(book: string, chapter: number) {
    const entries = await repository.record(book, chapter);
    await readingReports.record(book, chapter);
    return entries;
  },
};
