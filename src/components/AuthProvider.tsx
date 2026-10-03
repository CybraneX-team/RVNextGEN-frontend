"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authApi, type AuthUser, type Session } from "@/lib/api";

type Status = "loading" | "authed" | "anon";
type AuthContextValue = {
  status: Status;
  user: AuthUser | null;
  accessToken: string | null;
  /** Adopt a session returned by login / verify / Google, and tell the other tabs. */
  signIn: (session: Session) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const CHANNEL = "rv-auth";

/** Refreshes are serialized across tabs: the refresh token rotates, so concurrent uses would invalidate each other. */
async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) return task();
  return await navigator.locks.request("rv-refresh", task);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const channel = useRef<BroadcastChannel | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);

  const adopt = useCallback((next: Session | null) => {
    window.clearTimeout(timer.current);
    setSession(next);
    setStatus(next ? "authed" : "anon");
    // Renew the short-lived access token a minute before it expires.
    if (next) timer.current = window.setTimeout(() => void refreshRef.current(), Math.max(next.expiresIn - 60, 30) * 1000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      adopt(await withRefreshLock(() => authApi<Session>("refresh")));
    } catch {
      adopt(null);
    }
  }, [adopt]);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    void refreshRef.current();
    const bc = new BroadcastChannel(CHANNEL);
    channel.current = bc;
    bc.onmessage = (event) => {
      if (event.data === "signed-in") void refreshRef.current();
      if (event.data === "signed-out") adopt(null);
    };
    return () => { bc.close(); window.clearTimeout(timer.current); };
  }, [adopt]);

  const signIn = useCallback((next: Session) => {
    adopt(next);
    channel.current?.postMessage("signed-in");
  }, [adopt]);

  const signOut = useCallback(async () => {
    await authApi("logout").catch(() => undefined);
    adopt(null);
    channel.current?.postMessage("signed-out");
  }, [adopt]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user: session?.user ?? null, accessToken: session?.accessToken ?? null, signIn, signOut }),
    [status, session, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

/** Sends signed-in visitors straight to the app (used on the login / signup screens). */
export function useRedirectIfSignedIn(destination = "/") {
  const { status } = useAuth();
  const router = useRouter();
  useEffect(() => { if (status === "authed") router.replace(destination); }, [status, router, destination]);
}

/** Renders children only for signed-in users; everyone else is sent to the welcome screen. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  useEffect(() => { if (status === "anon") router.replace("/login"); }, [status, router]);
  return status === "authed" ? <>{children}</> : null;
}
