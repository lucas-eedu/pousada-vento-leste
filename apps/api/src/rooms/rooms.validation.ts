
import type { RoomInput } from './rooms.repository.js';

export function validateCapacity(capacity:unknown): boolean{
    return (
        typeof capacity === 'number' && Number.isInteger(capacity) && capacity > 0 && capacity <= 4
    );
}

export function validateRoomNumber(roomNumber:unknown): boolean{
    return(
        typeof roomNumber === 'string' && roomNumber.trim().length > 0
    );
}

export function validateDailyRate(dailyRate:unknown):boolean{
    return(
        typeof dailyRate === 'number' && Math.abs(dailyRate * 100 - Math.round(dailyRate * 100)) < 1e-7 && Number.isFinite(dailyRate) && dailyRate > 0 && dailyRate <= 99999999.99 
    );
}

export function validateDescription(description:unknown): boolean{
    return(
        typeof description ==='string'
    );
}

export function validateId(id:unknown): boolean{
    return (
        typeof id === 'number' && Number.isSafeInteger(id) && id > 0 && id <= 2147483647
    );
}

export function validateRoomInput(data: unknown): data is RoomInput {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
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
