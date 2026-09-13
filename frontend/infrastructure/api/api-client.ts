import { getStoredToken } from "infrastructure/api/token-storage.ts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Thrown when the request never got a response at all (server down, offline, DNS
// failure, CORS misconfiguration) — distinct from ApiError, which means the server
// was reachable and responded but rejected the request (bad auth, validation, etc.).
export class NetworkError extends Error {
  constructor() {
    super("Unable to reach the server. Check your connection and try again.");
  }
}

// Set once by the app's composition root (ports/context/context-providers.tsx) so
// a 401 from *any* call - not just the initial session restore - flips auth state
// back to "please sign in" instead of leaving the UI stuck showing per-request
// error messages for a session that's actually gone. A plain callback (rather than
// importing the store here) avoids a circular import between this module and
// store.ts, which pulls in every saga - including the one that calls apiFetch -
// through sagas.ts.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new NetworkError();
  }

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.();
    }
    const body = await response.json().catch(() => ({}) as { error?: string });
    throw new ApiError(body.error ?? `Request failed with status ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
