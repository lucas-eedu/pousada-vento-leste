import { request } from '../api';

export interface Room {
  id: number;
  number: string;
  capacity: number;
  /** O PostgreSQL devolve NUMERIC como texto, por exemplo "250.00". */
  daily_rate: string;
  description: string;
  created_at: string;
}

export interface RoomInput {
  number: string;
  capacity: number;
  daily_rate: number;
  description: string;
}

export function listRooms(): Promise<Room[]> {
  return request<Room[]>('/api/rooms');
}

export function createRoom(input: RoomInput): Promise<Room> {
  return request<Room>('/api/rooms', { method: 'POST', body: JSON.stringify(input) });
}

export function updateRoom(id: number, input: RoomInput): Promise<Room> {
  return request<Room>(`/api/rooms/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteRoom(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/rooms/${id}`, { method: 'DELETE' });
}
