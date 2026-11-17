import type { ReservationInput } from './reservations.repository.js';

const MAX_ID = 2147483647;
const MAX_GUEST_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 500;

export type ReservationValidationResult =
  | { ok: true; input: ReservationInput }
  | { ok: false; error: string };

export function parseId(rawId: string): number | null {
  if (!/^\d+$/.test(rawId)) return null;
  const id = Number(rawId);
  return Number.isSafeInteger(id) && id > 0 && id <= MAX_ID ? id : null;
}

/** Aceita apenas datas reais no formato AAAA-MM-DD (rejeita, por exemplo, 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Valida o corpo de criação/edição de reserva. Capacidade do quarto e conflito
 * de datas ficam com withReservationAvailability, que consulta o banco.
 */
export function validateReservationInput(data: unknown): ReservationValidationResult {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'O corpo da requisição deve ser um objeto JSON.' };
  }
  const body = data as Record<string, unknown>;

  if (typeof body.guest_name !== 'string' || body.guest_name.trim() === '') {
    return { ok: false, error: 'Informe o nome do hóspede.' };
  }
  const guestName = body.guest_name.trim();
  if (guestName.length > MAX_GUEST_NAME_LENGTH) {
    return { ok: false, error: `O nome do hóspede deve ter no máximo ${MAX_GUEST_NAME_LENGTH} caracteres.` };
  }

  const guestCount = body.guest_count;
  if (typeof guestCount !== 'number' || !Number.isInteger(guestCount) || guestCount <= 0 || guestCount > MAX_ID) {
    return { ok: false, error: 'A quantidade de hóspedes deve ser um número inteiro positivo.' };
  }

  if (!isIsoDate(body.check_in)) {
    return { ok: false, error: 'Informe uma data de entrada válida no formato AAAA-MM-DD.' };
  }
  if (!isIsoDate(body.check_out)) {
    return { ok: false, error: 'Informe uma data de saída válida no formato AAAA-MM-DD.' };
  }
  if (body.check_out <= body.check_in) {
    return { ok: false, error: 'A data de saída deve ser posterior à data de entrada.' };
  }

  const notes = body.notes ?? '';
  if (typeof notes !== 'string') {
    return { ok: false, error: 'As observações devem ser um texto.' };
  }
  if (notes.trim().length > MAX_NOTES_LENGTH) {
    return { ok: false, error: `As observações devem ter no máximo ${MAX_NOTES_LENGTH} caracteres.` };
  }

  return {
    ok: true,
    input: {
      guest_name: guestName,
      guest_count: guestCount,
      check_in: body.check_in,
      check_out: body.check_out,
      notes: notes.trim()
    }
  };
}
