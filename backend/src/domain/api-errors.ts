export type ApiErrorCode =
  | RouteUnavailableReason
  | 'VALIDATION_ERROR'
  | 'ADAPTER_UNAVAILABLE'
  | 'NOT_FOUND';

export type RouteUnavailableReason =
  | 'ROUTE_UNAVAILABLE'
  | 'NO_SUPPORTED_PAYOUT_RAIL'
  | 'EARN_UNWIND_REQUIRED'
  | 'INSUFFICIENT_BALANCE'
  | 'QUOTE_EXPIRED';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly statusCode = 400,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
