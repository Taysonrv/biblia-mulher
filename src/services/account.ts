import { createAccountService } from './auth-model';
import { firebaseAccount } from './firebase-account';
export const accountService = createAccountService(firebaseAccount);
