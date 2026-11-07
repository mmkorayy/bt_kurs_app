export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let unauthorizedHandler: (() => void) | undefined;

/** Herhangi bir istek 401 dönerse çağrılır (oturum düştü). */
export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Giriş ve "ben kimim" istekleri için: 401 beklenen bir cevaptır, oturum kaybı sayılmaz. */
  skipUnauthorized?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipUnauthorized = false } = options;

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'network', 'Sunucuya ulaşılamadı.');
  }

  if (response.status === 204) return undefined as T;

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = undefined;
  }

  if (!response.ok) {
    if (response.status === 401 && !skipUnauthorized) unauthorizedHandler?.();
    const error = (data as { error?: { code?: string; message?: string } } | undefined)?.error;
    throw new ApiError(response.status, error?.code ?? 'server_error', error?.message ?? 'Bir şeyler ters gitti.');
  }
  return data as T;
}
