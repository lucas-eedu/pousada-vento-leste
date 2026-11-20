/** Maior valor da coluna INTEGER do PostgreSQL. */
const MAX_ID = 2147483647;

export function isValidId(id: unknown): id is number {
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 && id <= MAX_ID;
}

/** Converte o ID recebido na URL. Devolve null quando ele não é um inteiro positivo válido. */
export function parseId(rawId: string): number | null {
  if (!/^\d+$/.test(rawId)) return null;
  const id = Number(rawId);
  return isValidId(id) ? id : null;
}
