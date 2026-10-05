import { ApiError, messageFrom } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Access token from useAuth(); required for anything behind AccessTokenGuard. */
  token?: string | null;
  /** Needed by the Cloudflare playback endpoint. */
  deviceId?: string;
  signal?: AbortSignal;
};

/**
 * Calls the RVgen backend directly (browser → backend) with the access token as a Bearer header.
 * The backend's CORS allows the frontend origin, and the refresh token never travels here — that
 * stays in the httpOnly cookie owned by the same-origin /api/auth proxy. `path` is relative to /api.
 */
export async function apiFetch<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, token, deviceId, signal } = opts;
  const isFormData = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/${path}`, {
      method,
      headers: {
        ...(body !== undefined && !isFormData ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(deviceId ? { "x-device-id": deviceId } : {}),
      },
      body: body === undefined ? undefined : isFormData ? body as BodyInit : JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError("The server sent an unexpected response. Please try again.", response.status);
  }
  if (!response.ok) throw new ApiError(messageFrom(data, "Something went wrong. Try again."), response.status);
  return data as T;
}
