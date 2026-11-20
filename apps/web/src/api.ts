/** Erro devolvido pela API, com a mensagem pronta para mostrar ao usuário. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Faz a requisição à API própria e devolve o JSON, ou lança ApiError com a mensagem do servidor. */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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

/** Mensagem para a interface a partir de qualquer erro capturado. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Ocorreu um erro inesperado. Tente novamente.';
}
