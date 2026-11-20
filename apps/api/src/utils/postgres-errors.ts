/** Códigos de erro do PostgreSQL usados pela API. */
export const UNIQUE_VIOLATION = '23505';
export const FOREIGN_KEY_VIOLATION = '23503';
/** PostgreSQL 18 usa este código quando uma chave ON DELETE RESTRICT impede a exclusão. */
export const RESTRICT_VIOLATION = '23001';

export function hasPostgresCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

/** Exclusão bloqueada porque outro registro ainda referencia a linha (23503 ou 23001, conforme a versão). */
export function isReferencedRowError(error: unknown): boolean {
  return hasPostgresCode(error, FOREIGN_KEY_VIOLATION) || hasPostgresCode(error, RESTRICT_VIOLATION);
}
