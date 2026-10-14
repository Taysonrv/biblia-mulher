import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAgendaRepository } from './agenda-repository';
import { agendaReminders } from './agenda-reminders';

import { localData } from './local-data';
export const agendaRepository = localData.wrap(createAgendaRepository(AsyncStorage, agendaReminders));
