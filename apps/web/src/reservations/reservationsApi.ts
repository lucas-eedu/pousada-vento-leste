import { request } from '../api';

export interface Reservation {
  id: number;
  room_id: number;
  guest_name: string;
  guest_count: number;
  check_in: string;
  check_out: string;
  notes: string;
  created_at?: string;
}

export interface ReservationInput {
  guest_name: string;
  guest_count: number;
  check_in: string;
  check_out: string;
  notes: string;
}

export function listReservations(roomId: number): Promise<Reservation[]> {
  return request<Reservation[]>(`/api/rooms/${roomId}/reservations`);
}

export function createReservation(roomId: number, input: ReservationInput): Promise<Reservation> {
  return request<Reservation>(`/api/rooms/${roomId}/reservations`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function updateReservation(id: number, input: ReservationInput): Promise<Reservation> {
  return request<Reservation>(`/api/reservations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input)
  });
}

export function deleteReservation(id: number): Promise<unknown> {
  return request<unknown>(`/api/reservations/${id}`, {
    method: 'DELETE'
  });
}