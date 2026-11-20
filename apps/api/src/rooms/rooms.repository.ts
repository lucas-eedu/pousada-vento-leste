import type { Queryable } from '../database.js';

export interface Room {
    id: number;
    number: string;
    capacity: number;
    daily_rate: string;
    description: string;
    created_at: Date;
}

export interface RoomInput {
    number: string;
    capacity: number;
    daily_rate: number;
    description: string;
}

const COLUMNS = 'id, number, capacity, daily_rate, description, created_at';

export async function findAllRooms(db: Queryable): Promise<Room[]> {
    const result = await db.query<Room>(`SELECT ${COLUMNS} FROM rooms ORDER BY number`);
    return result.rows;
}

export async function findRoomById(db: Queryable, id: number): Promise<Room | undefined> {
    const result = await db.query<Room>(`SELECT ${COLUMNS} FROM rooms WHERE id = $1`, [id]);
    return result.rows[0];
}

/** Bloqueia o quarto até o fim da transação. Devolve false se ele não existir. */
export async function lockRoomById(db: Queryable, id: number): Promise<boolean> {
    const result = await db.query('SELECT id FROM rooms WHERE id = $1 FOR UPDATE', [id]);
    return (result.rowCount ?? 0) > 0;
}

export async function createRoom(db: Queryable, room: RoomInput): Promise<Room> {
    const result = await db.query<Room>(
        `INSERT INTO rooms (number, capacity, daily_rate, description) VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
        [room.number, room.capacity, room.daily_rate, room.description]
    );
    return result.rows[0]!;
}

export async function updateRoom(db: Queryable, id: number, room: RoomInput): Promise<Room | undefined> {
    const result = await db.query<Room>(
        `UPDATE rooms SET number = $1, capacity = $2, daily_rate = $3, description = $4 WHERE id = $5 RETURNING ${COLUMNS}`,
        [room.number, room.capacity, room.daily_rate, room.description, id]
    );
    return result.rows[0];
}

export async function deleteRoom(db: Queryable, id: number): Promise<boolean> {
    const result = await db.query('DELETE FROM rooms WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
}
