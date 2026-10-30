import type { Pool } from "pg";

export interface Room{
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


export async function findAllRooms(pool: Pool): Promise<Room[]>{
    const result = await pool.query<Room>(
        'SELECT id, number, capacity, daily_rate, description, created_at FROM rooms ORDER BY number'
    );
    return result.rows;
}

export async function findRoomById(pool:Pool, id: number): Promise<Room | undefined> {
    const result = await pool.query<Room>(
        'SELECT id, number, capacity, daily_rate, description, created_at FROM rooms WHERE id = $1', [id]
    )

    return result.rows[0];
    
}

export async function createRoom(pool:Pool, room: RoomInput): Promise<Room> {
    const result = await pool.query<Room>(
        'INSERT INTO rooms(number, capacity, daily_rate, description) VALUES($1, $2, $3, $4) RETURNING *',
        [room.number, room.capacity, room.daily_rate, room.description]
    );

    return result.rows[0]!;
}

export async function updateRoom(pool:Pool, id: number, room: RoomInput): Promise<Room | undefined> {
    const result = await pool.query<Room>(
       'UPDATE rooms SET number = $1, capacity = $2, daily_rate = $3, description = $4 WHERE id = $5 RETURNING *',
        [ room.number, room.capacity, room.daily_rate, room.description, id]
    );
    return result.rows[0];
}

export async function deleteRoom(pool:Pool, id: number): Promise<boolean> {
    const result =  await pool.query(
        'DELETE FROM rooms WHERE id = $1',
        [id]
    );
    return (result.rowCount ?? 0) > 0;
}