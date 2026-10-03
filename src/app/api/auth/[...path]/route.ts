import { NextResponse, type NextRequest } from "next/server";

/**
 * Same-origin proxy to the RVgen backend's /auth routes. The browser never sees the refresh token:
 * it is moved into an httpOnly cookie here, and read back from that cookie for refresh/logout.
 */

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";
const REFRESH_COOKIE = "rv_refresh";
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

const POST_ROUTES = new Set([
  "register", "login", "verify-email", "verification-status", "resend-verification",
  "forgot-password", "reset-password", "google/exchange", "apple", "refresh", "logout",
]);
const GET_ROUTES = new Set(["me"]);

type Context = { params: Promise<{ path: string[] }> };

function cookieOptions(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/api/auth", maxAge };
}

async function forward(request: NextRequest, route: string, init: { method: string; body?: unknown }) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) headers["x-forwarded-for"] = forwarded;
  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers["user-agent"] = userAgent;
  const authorization = request.headers.get("authorization");
  if (authorization) headers.authorization = authorization;

  try {
    return await fetch(`${BACKEND_URL}/api/auth/${route}`, {
      method: init.method, headers, cache: "no-store",
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    return null;
  }
}

async function handle(request: NextRequest, { params }: Context, method: "GET" | "POST") {
  const { path } = await params;
  const route = path.join("/");
  if (!(method === "GET" ? GET_ROUTES : POST_ROUTES).has(route)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown> | undefined;
  if (method === "POST") {
    body = await request.json().catch(() => ({}));
    if (route === "refresh" || route === "logout") {
      const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
      if (!refreshToken) {
        return route === "logout"
          ? new NextResponse(null, { status: 204 })
          : NextResponse.json({ message: "Not signed in" }, { status: 401 });
      }
      body = { refreshToken };
    }
  }

  const upstream = await forward(request, route, { method, body });
  if (!upstream) return NextResponse.json({ message: "Could not reach the server. Try again." }, { status: 502 });

  const text = await upstream.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  // Hold the refresh token back from the browser; it only travels in the httpOnly cookie.
  const refreshToken = upstream.ok && typeof data?.refreshToken === "string" ? data.refreshToken : null;
  if (data) delete data.refreshToken;

  const response = data === null
    ? new NextResponse(null, { status: upstream.status })
    : NextResponse.json(data, { status: upstream.status });

  if (refreshToken) response.cookies.set(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
  else if (route === "logout" || (route === "refresh" && upstream.status === 401)) {
    response.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
  }
  return response;
}

export const GET = (request: NextRequest, context: Context) => handle(request, context, "GET");
export const POST = (request: NextRequest, context: Context) => handle(request, context, "POST");
