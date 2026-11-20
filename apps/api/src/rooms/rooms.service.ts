import type { Pool } from 'pg';
import { withTransaction } from '../database.js';
import { findLargestGuestCount } from '../reservations/reservations.repository.js';
import { lockRoomById, updateRoom, type Room, type RoomInput } from './rooms.repository.js';

/** A nova capacidade deixaria alguma reserva do quarto acima do limite. */
export class RoomCapacityConflictError extends Error {}

/**
 * Atualiza o quarto sem permitir que a capacidade fique abaixo do número de
 * hóspedes de uma reserva existente. O quarto fica bloqueado durante a
 * verificação, assim como em withReservationAvailability, e por isso uma
 * reserva nova não pode ser gravada no meio da atualização.
 */
export async function updateRoomKeepingReservationsValid(pool: Pool, id: number, input: RoomInput): Promise<Room | undefined> {
    return withTransaction(pool, async client => {
        if (!(await lockRoomById(client, id))) return undefined;

        const largestGuestCount = await findLargestGuestCount(client, id);
        if (largestGuestCount > input.capacity) {
            throw new RoomCapacityConflictError(
                `Não é possível reduzir a capacidade para ${input.capacity}: há reserva com ${largestGuestCount} hóspedes neste quarto.`
            );
        }

        return updateRoom(client, id, input);
    });
}
