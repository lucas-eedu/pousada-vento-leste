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

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined
    });
  } catch {
    throw new ApiError('Não foi possível conectar à API. Verifique se o servidor está em execução.', 0);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Erro inesperado da API (HTTP ${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return body as T;
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
