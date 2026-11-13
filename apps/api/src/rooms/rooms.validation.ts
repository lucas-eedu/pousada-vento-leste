
import type { RoomInput } from './rooms.repository.js';

const MAX_CAPACITY = 4;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_DAILY_RATE = 99999999.99;
const MAX_ROOM_ID = 2147483647;

export function validateCapacity(capacity: unknown): boolean {
    return (
        typeof capacity === 'number' &&
        Number.isInteger(capacity) &&
        capacity > 0 &&
        capacity <= MAX_CAPACITY
    );
}

export function validateRoomNumber(roomNumber: unknown): boolean {
    return (
        typeof roomNumber === 'string' &&
        /^[1-9]\d{2}$/.test(roomNumber)
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

export function validateId(id: unknown): boolean {
    return (
        typeof id === 'number' &&
        Number.isSafeInteger(id) &&
        id > 0 &&
        id <= MAX_ROOM_ID
    );
}

export function validateRoomInput(data: unknown): data is RoomInput {
    if (
        typeof data !== 'object' ||
        data === null ||
        Array.isArray(data)
    ) {
        return false;
    }

    const room = data as Record<string, unknown>;

    return (
        validateRoomNumber(room.number) &&
        validateCapacity(room.capacity) &&
        validateDailyRate(room.daily_rate) &&
        validateDescription(room.description)
    );
}

export function parseRoomId(rawId: string): number | null {
    if (!/^\d+$/.test(rawId)) {
        return null;
    }

    const id = Number(rawId);

    return validateId(id) ? id : null;
}
