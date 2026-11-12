import { useCallback, useEffect, useState } from "react";

export const API_URL: string = import.meta.env.VITE_API_URL ?? "https://agridrone-api-olnv.onrender.com/api/v1";

export type Role = "operator" | "farm_owner" | "admin";
export type User = { id: string; role: Role; fullName: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// The session lives in sessionStorage: it ends when the tab closes (safer on shared
// lab computers), and the server rejects the token after 1 hour anyway.
const SESSION_KEY = "agricdrone-admin-session";
type Session = { token: string; user: User };

export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage blocked: the session just won't survive a refresh.
  }
}

let token: string | null = loadSession()?.token ?? null;
let onSessionEnded: (() => void) | null = null;

export function setToken(value: string | null) {
  token = value;
}

/** Called when the server says the session is over (expired, or the account was suspended). */
export function onUnauthorized(handler: () => void) {
  onSessionEnded = handler;
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_URL + path, {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach AgricDrone Hub. Check your connection and try again.", 0);
  }

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) onSessionEnded?.();
    throw new ApiError(data?.error?.message ?? "Something went wrong. Please try again.", response.status);
  }
  return data as T;
}

export const errorText = (e: unknown) => (e instanceof ApiError ? e.message : "Please try again.");

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

/** Loads `path` (skipped when null) and exposes data, error and a reload function. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!path) return;
    setError(null);
    try {
      setData(await api<T>(path));
    } catch (e) {
      setError(errorText(e));
    }
  }, [path]);

  useEffect(() => {
    setData(null);
    void reload();
  }, [reload]);

  return { data, error, reload };
}
