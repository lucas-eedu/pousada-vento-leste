import { ApiError, request } from '../api';

export interface Session {
  username: string;
}

/** Sessão atual, ou null se não houver login. */
export async function getSession(): Promise<Session | null> {
  try {
    return await request<Session>('/api/auth/session');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function login(username: string, password: string): Promise<Session> {
  return request<Session>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function logout(): Promise<unknown> {
  return request<unknown>('/api/auth/logout', { method: 'POST' });
}
