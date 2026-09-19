/** Mensagens de autenticação destinadas ao usuário, sem expor textos brutos da API. */
export function authErrorPtBr(error: unknown, fallback: string): string {
  const payload = error && typeof error === 'object'
    ? error as { code?: unknown; message?: unknown }
    : null;
  const code = typeof payload?.code === 'string' ? payload.code.toLowerCase() : '';
  const message = typeof payload?.message === 'string' ? payload.message : '';

  // Distinguir credenciais incorretas de e-mail pendente e de usuário sem equipe.
  const byCode: Record<string, string> = {
    invalid_credentials: 'Credenciais inválidas. Verifique seu e-mail e senha.',
    email_not_confirmed: 'E-mail ainda não confirmado. Confirme sua conta antes de entrar.',
    over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos antes de tentar novamente.',
    weak_password: 'A senha não atende aos requisitos de segurança.',
    email_exists: 'Já existe uma conta cadastrada com este e-mail.',
    user_already_exists: 'Já existe uma conta cadastrada com este e-mail.',
    signup_disabled: 'O cadastro de novas contas está desativado.',
    email_address_invalid: 'Informe um e-mail válido.',
  };
  if (byCode[code]) return byCode[code];

  if (/invalid login credentials|invalid credentials|invalid email or password|email or password is incorrect/i.test(message)) {
    return byCode.invalid_credentials;
  }
  if (/email (?:address )?not confirmed|confirm your email/i.test(message)) {
    return byCode.email_not_confirmed;
  }
  if (/too many requests|rate limit|security purposes.*seconds/i.test(message)) {
    return byCode.over_request_rate_limit;
  }
  if (/failed to fetch|network.*failed|load failed|fetch failed/i.test(message)) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  }
  if (/user already registered|already been registered|email already exists/i.test(message)) {
    return byCode.email_exists;
  }
  if (/password.*(?:weak|short|characters)/i.test(message)) {
    return byCode.weak_password;
  }
  if (/signups? (?:are )?disabled/i.test(message)) {
    return byCode.signup_disabled;
  }
  if (message === 'Usuário autenticado, mas sem perfil de colaborador ativo.') {
    return message;
  }
  // Falhas desconhecidas não exibem mensagens técnicas ou em inglês ao usuário.
  return fallback;
}
