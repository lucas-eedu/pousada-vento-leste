import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** Duração da sessão: 8 horas. */
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Compara textos em tempo constante, para não revelar quantos caracteres coincidem. */
export function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/** Token "dados.assinatura": os dados guardam o usuário e o vencimento, e a assinatura impede alterações. */
export function createSessionToken(username: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ username, expiresAt: now + SESSION_DURATION_MS })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

/** Devolve o usuário do token, ou null se ele for inválido, adulterado ou vencido. */
export function verifySessionToken(token: string, secret: string, now = Date.now()): string | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return null;

  try {
    const data: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data !== 'object' || data === null) return null;
    const { username, expiresAt } = data as Record<string, unknown>;
    if (typeof username !== 'string' || typeof expiresAt !== 'number' || expiresAt <= now) return null;
    return username;
  } catch {
    return null;
  }
}
