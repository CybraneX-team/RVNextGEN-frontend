import { ApiError, messageFrom } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Access token from useAuth(); required for anything behind AccessTokenGuard. */
  token?: string | null;
  /** Needed by the Cloudflare playback endpoint. */
  deviceId?: string;
  /** Extra request headers (e.g. idempotency-key for checkout endpoints). */
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/**
 * Calls the RVgen backend directly (browser → backend) with the access token as a Bearer header.
 * The backend's CORS allows the frontend origin, and the refresh token never travels here — that
 * stays in the httpOnly cookie owned by the same-origin /api/auth proxy. `path` is relative to /api.
 */
export async function apiFetch<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, token, deviceId, headers, signal } = opts;
  const isFormData = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/${path}`, {
      method,
      headers: {
        ...(body !== undefined && !isFormData ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(deviceId ? { "x-device-id": deviceId } : {}),
        ...devGeoHeader(),
        ...(headers ?? {}),
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

/**
 * Dev-only: send the page's ?geo=XX as an x-geo-test header so region-based pricing/gateway can be
 * previewed without a real geo-IP. A header (not a query param) avoids colliding with strict query
 * validation. Stripped in production builds; the backend also ignores it in production.
 */
function devGeoHeader(): Record<string, string> {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return {};
  const geo = new URLSearchParams(window.location.search).get("geo");
  return geo && /^[A-Za-z]{2}$/.test(geo) ? { "x-geo-test": geo.toUpperCase() } : {};
}
