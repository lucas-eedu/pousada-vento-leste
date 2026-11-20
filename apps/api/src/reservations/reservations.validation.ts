import type { ReservationInput } from './reservations.repository.js';

/** Maior valor da coluna INTEGER do PostgreSQL. */
const MAX_INTEGER = 2147483647;
const MAX_GUEST_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 500;
const MAX_EMAIL_LENGTH = 254;
/** DDD (11 a 99) seguido de 8 dígitos (fixo) ou 9 dígitos (celular). */
const PHONE_DIGITS = /^[1-9]\d{9,10}$/;
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_PHONE = 'Informe um telefone válido com DDD, por exemplo (85) 99999-9999.';
const INVALID_EMAIL = 'Informe um e-mail válido, por exemplo nome@exemplo.com.';

export type ReservationValidationResult =
  | { ok: true; input: ReservationInput }
  | { ok: false; error: string };

/** Aceita apenas datas reais no formato AAAA-MM-DD (rejeita, por exemplo, 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

type FieldResult = { ok: true; value: string } | { ok: false; error: string };

/** Aceita máscaras como "(85) 99999-0000" e devolve só os dígitos. */
export function parsePhone(value: unknown): FieldResult {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return { ok: false, error: 'Informe o telefone de contato.' };
  }
  if (typeof value !== 'string' || !/^[\d\s()+-]+$/.test(value)) return { ok: false, error: INVALID_PHONE };
  const digits = value.replace(/\D/g, '');
  return PHONE_DIGITS.test(digits) ? { ok: true, value: digits } : { ok: false, error: INVALID_PHONE };
}

/** E-mail opcional: vazio é aceito; preenchido, precisa ter formato válido. */
export function parseEmail(value: unknown): FieldResult {
  if (value === undefined || value === null) return { ok: true, value: '' };
  if (typeof value !== 'string') return { ok: false, error: INVALID_EMAIL };
  const email = value.trim().toLowerCase();
  if (email === '') return { ok: true, value: '' };
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_FORMAT.test(email) ? { ok: true, value: email } : { ok: false, error: INVALID_EMAIL };
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

  const phone = parsePhone(body.guest_phone);
  if (!phone.ok) return phone;
  const email = parseEmail(body.guest_email);
  if (!email.ok) return email;

  const guestCount = body.guest_count;
  if (typeof guestCount !== 'number' || !Number.isInteger(guestCount) || guestCount <= 0 || guestCount > MAX_INTEGER) {
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
      guest_phone: phone.value,
      guest_email: email.value,
      guest_count: guestCount,
      check_in: body.check_in,
      check_out: body.check_out,
      notes: notes.trim()
    }
  };
}
