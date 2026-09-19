export class BackendApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof BackendApiError) {
    return err.message || err.code;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
