export interface AccountUser { uid: string; email: string | null; name: string | null; verified: boolean; providers: string[] }
export interface AuthAdapter {
  configured: boolean;
  current(): AccountUser | null;
  subscribe(listener: (user: AccountUser | null) => void, error: () => void): () => void;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<string>;
  reset(email: string): Promise<void>;
  google(): Promise<'success' | 'cancelled'>;
  logout(): Promise<void>;
  verify(): Promise<void>;
  reload(): Promise<void>;
}
export class AuthInputError extends Error {}
export function validEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthInputError('Informe um e-mail válido.');
  return email;
}
export function validPassword(password: string, registration = false) {
  if (!password.trim() || password.length > 128 || (registration && password.length < 8)) throw new AuthInputError(registration ? 'Use uma senha de 8 a 128 caracteres.' : 'Informe sua senha, com até 128 caracteres.');
  return password;
}
export function validRegistration(name: string, email: string, password: string, confirmation: string) {
  const displayName = name.trim().replace(/\s+/g, ' ');
  if (displayName.length < 2 || displayName.length > 60) throw new AuthInputError('Informe seu nome, com 2 a 60 caracteres.');
  const normalizedEmail = validEmail(email); validPassword(password, true);
  if (password !== confirmation) throw new AuthInputError('As senhas precisam ser iguais.');
  return { name: displayName, email: normalizedEmail, password };
}
export function authErrorMessage(reason: unknown): string {
  if (reason instanceof AuthInputError) return reason.message;
  const code = reason && typeof reason === 'object' && 'code' in reason ? String(reason.code) : '';
  const messages: Record<string, string> = {
    'auth/not-configured': 'O acesso à conta ainda aguarda ativação. Você pode continuar usando o app sem entrar.',
    'auth/in-progress': 'Aguarde a operação atual terminar.',
    'auth/invalid-credential': 'E-mail ou senha incorretos. Confira os dados ou recupere sua senha.',
    'auth/wrong-password': 'E-mail ou senha incorretos. Confira os dados ou recupere sua senha.',
    'auth/user-not-found': 'E-mail ou senha incorretos. Confira os dados ou recupere sua senha.',
    'auth/invalid-email': 'Informe um e-mail válido.',
    'auth/email-already-in-use': 'Não foi possível cadastrar esse e-mail. Tente entrar ou recuperar sua senha.',
    'auth/weak-password': 'Essa senha não atende aos requisitos da conta. Escolha uma senha mais forte.',
    'auth/password-does-not-meet-requirements': 'Essa senha não atende aos requisitos da conta. Escolha uma senha mais forte.',
    'auth/network-request-failed': 'Confira sua conexão e tente novamente.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/user-disabled': 'Essa conta está desativada. Entre em contato com o suporte do aplicativo.',
    'auth/operation-not-allowed': 'Essa forma de entrar ainda não foi ativada. Tente outra opção.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita a abertura e tente novamente.',
    'auth/unauthorized-domain': 'O acesso pelo Google ainda precisa ser ativado para esta versão do app.',
    'auth/account-exists-with-different-credential': 'Já existe outra forma de entrar com esse e-mail. Entre pelo método usado antes.',
    'auth/google-unavailable': 'O login Google precisa de uma versão própria do aplicativo. Nesta prévia, use o e-mail ou continue sem conta.',
    'auth/google-not-configured': 'O acesso pelo Google ainda aguarda ativação. Use outra opção ou continue sem conta.',
    'auth/no-user': 'Entre na sua conta para continuar.',
    'auth/google-services': 'O Google não está disponível neste aparelho. Confira os serviços do Google ou use o e-mail.',
  };
  return messages[code] ?? 'Não foi possível concluir o acesso. Tente novamente.';
}
export function authFailure(code: string) { return Object.assign(new Error(code), { code }); }

export function createAccountService(adapter: AuthAdapter) {
  let locked = false;
  async function run<T>(operation: () => Promise<T>): Promise<T> {
    if (locked) throw authFailure('auth/in-progress');
    if (!adapter.configured) throw authFailure('auth/not-configured');
    locked = true; try { return await operation(); } finally { locked = false; }
  }
  return {
    configured: adapter.configured, current: adapter.current, subscribe: adapter.subscribe,
    login: (email: string, password: string) => run(async () => { await adapter.login(validEmail(email), validPassword(password)); return 'Você entrou na sua conta.'; }),
    register: (name: string, email: string, password: string, confirmation: string) => run(async () => {
      const values = validRegistration(name, email, password, confirmation); return adapter.register(values.name, values.email, values.password);
    }),
    reset: (email: string) => run(async () => {
      try { await adapter.reset(validEmail(email)); }
      catch (reason) { if (!reason || typeof reason !== 'object' || !('code' in reason) || reason.code !== 'auth/user-not-found') throw reason; }
      return 'Se existir uma conta com esse e-mail, você receberá as instruções para redefinir a senha. Confira também o spam.';
    }),
    google: () => run(async () => await adapter.google() === 'cancelled' ? 'Login Google cancelado. Você pode tentar novamente ou continuar sem conta.' : 'Você entrou com o Google.'),
    logout: () => run(async () => { await adapter.logout(); return 'Você saiu da conta. Os dados deste aparelho continuam disponíveis.'; }),
    verify: () => run(async () => { await adapter.verify(); return 'Mensagem de confirmação enviada. Confira sua caixa de entrada e o spam.'; }),
    reload: () => run(async () => { await adapter.reload(); return adapter.current()?.verified ? 'E-mail confirmado.' : 'Seu e-mail ainda não foi confirmado. Abra a mensagem recebida e tente novamente.'; }),
  };
}
