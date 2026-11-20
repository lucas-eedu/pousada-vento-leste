import type { RoomInput } from './rooms.repository.js';

export const MAX_CAPACITY = 4;
const MAX_DESCRIPTION_LENGTH = 500;
/** Limite da coluna NUMERIC(10, 2). */
const MAX_DAILY_RATE = 99999999.99;

export type RoomValidationResult =
    | { ok: true; input: RoomInput }
    | { ok: false; error: string };

export function validateCapacity(capacity: unknown): boolean {
    return (
        typeof capacity === 'number' &&
        Number.isInteger(capacity) &&
        capacity > 0 &&
        capacity <= MAX_CAPACITY
    );
}

/** Número com exatamente 3 dígitos, de 100 a 999. Espaços nas pontas são ignorados. */
export function validateRoomNumber(roomNumber: unknown): boolean {
    return (
        typeof roomNumber === 'string' &&
        /^[1-9]\d{2}$/.test(roomNumber.trim())
    );
}

export function validateDailyRate(dailyRate: unknown): boolean {
    return (
        typeof dailyRate === 'number' &&
        Number.isFinite(dailyRate) &&
        dailyRate > 0 &&
        dailyRate <= MAX_DAILY_RATE &&
        Math.abs(dailyRate * 100 - Math.round(dailyRate * 100)) < 1e-7
    );
}

export function validateDescription(description: unknown): boolean {
    return (
        typeof description === 'string' &&
        description.length <= MAX_DESCRIPTION_LENGTH
    );
}

/**
 * Valida o corpo de cadastro/edição de quarto e devolve os dados normalizados
 * ou a mensagem do primeiro campo inválido. A descrição é opcional.
 */
export function parseRoomInput(data: unknown): RoomValidationResult {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return { ok: false, error: 'O corpo da requisição deve ser um objeto JSON.' };
    }

    const room = data as Record<string, unknown>;
    const description = room.description === undefined ? '' : room.description;

    if (room.number === undefined || (typeof room.number === 'string' && room.number.trim() === '')) {
        return { ok: false, error: 'Informe o número do quarto.' };
    }
    if (!validateRoomNumber(room.number)) {
        return { ok: false, error: 'O número do quarto deve ter 3 dígitos, de 100 a 999.' };
    }
    if (!validateCapacity(room.capacity)) {
        return { ok: false, error: `A capacidade deve ser um número inteiro de 1 a ${MAX_CAPACITY} hóspedes.` };
    }
    if (!validateDailyRate(room.daily_rate)) {
        return { ok: false, error: 'A diária deve ser um valor positivo, com até duas casas decimais.' };
    }
    if (!validateDescription(description)) {
        return { ok: false, error: `A descrição deve ser um texto de no máximo ${MAX_DESCRIPTION_LENGTH} caracteres.` };
    }

    return {
        ok: true,
        input: {
            number: (room.number as string).trim(),
            capacity: room.capacity as number,
            daily_rate: room.daily_rate as number,
            description: (description as string).trim()
        }
    };
}

export function validateRoomInput(data: unknown): boolean {
    return parseRoomInput(data).ok;
}
