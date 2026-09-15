// A separate, minimal client from infrastructure/api/api-client.ts on purpose -
// a browser could hold a directory session and one or more Space sessions at
// the same time, and the two must never share a token store or an
// Authorization header by accident.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class SpaceApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function tokenKey(spaceSlug: string): string {
  return `space-session:${spaceSlug}`;
}

export type SpaceSession = { token: string; participantId: string; email: string };

export function getSpaceSession(spaceSlug: string): SpaceSession | null {
  try {
    const raw = localStorage.getItem(tokenKey(spaceSlug));
    return raw ? (JSON.parse(raw) as SpaceSession) : null;
  } catch {
    return null;
  }
}

export function setSpaceSession(spaceSlug: string, session: SpaceSession): void {
  localStorage.setItem(tokenKey(spaceSlug), JSON.stringify(session));
}

export function clearSpaceSession(spaceSlug: string): void {
  localStorage.removeItem(tokenKey(spaceSlug));
}

export async function spaceApiFetch<T>(spaceSlug: string | null, path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  const session = spaceSlug ? getSpaceSession(spaceSlug) : null;
  if (session) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new SpaceApiError("Unable to reach the server. Check your connection and try again.", 0);
  }

  if (!response.ok) {
    if (response.status === 401 && spaceSlug) {
      // Same reasoning as the directory's onUnauthorized hook: a session that's
      // no longer valid shouldn't keep being sent on every subsequent call.
      clearSpaceSession(spaceSlug);
    }
    const body = await response.json().catch(() => ({}) as { error?: string });
    throw new SpaceApiError(body.error ?? `Request failed with status ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
