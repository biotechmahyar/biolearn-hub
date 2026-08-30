/**
 * Unified API response utilities for NIBRC Iran Backend.
 */

export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

export function success<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function created<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function errorResponse(message: string, code?: string): ApiError {
  return { ok: false, error: message, code };
}
