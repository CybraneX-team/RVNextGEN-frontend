export type AuthUser = { id: string; email: string; role: "USER" | "CREATOR" | "ADMIN"; emailVerified: boolean; displayName: string | null; avatarUrl: string | null };
export type Session = { user: AuthUser; accessToken: string; expiresIn: number };

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** The backend answers with a string, or (for validation errors) a list of { path, message }. */
export function messageFrom(body: unknown, fallback: string): string {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) {
    const first = message[0] as { message?: unknown } | string | undefined;
    if (typeof first === "string") return first;
    if (typeof first?.message === "string") return first.message;
  }
  return fallback;
}

/** Calls the same-origin auth proxy (src/app/api/auth), which keeps the refresh token in an httpOnly cookie. */
export async function authApi<T = void>(route: string, body?: unknown, accessToken?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${route}`, {
      method: route === "me" ? "GET" : "POST",
      headers: { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
      body: route === "me" ? undefined : JSON.stringify(body ?? {}),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // An HTML error page (e.g. the dev server hiccuped) is not something to show a user verbatim.
    throw new ApiError("The server sent an unexpected response. Please try again.", response.status);
  }
  if (!response.ok) throw new ApiError(messageFrom(data, "Something went wrong. Try again."), response.status);
  return data as T;
}
