import { randomBytes } from 'node:crypto';

/** Acesso único de administrador, definido por variáveis de ambiente. */
export interface AuthConfig {
  username: string;
  password: string;
  /** Chave que assina o cookie de sessão. */
  sessionSecret: string;
}

/**
 * Lê ADMIN_USERNAME, ADMIN_PASSWORD e, opcionalmente, SESSION_SECRET.
 * Sem SESSION_SECRET, gera uma chave aleatória: as sessões continuam
 * seguras, mas expiram sempre que o servidor reinicia.
 */
export function loadAuthConfig(env: NodeJS.ProcessEnv): AuthConfig {
  const username = env.ADMIN_USERNAME?.trim();
  const password = env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error('Defina ADMIN_USERNAME e ADMIN_PASSWORD para o acesso de administrador.');
  }
  return {
    username,
    password,
    sessionSecret: env.SESSION_SECRET || randomBytes(32).toString('hex')
  };
}
