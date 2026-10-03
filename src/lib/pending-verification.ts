/** What the "check your email" screen needs after sign-up; kept per tab so a reload does not lose it. */
export type PendingVerification = { email: string; pollToken: string };

const KEY = "rv-pending-verification";

export function savePendingVerification(value: PendingVerification) {
  try { sessionStorage.setItem(KEY, JSON.stringify(value)); } catch { /* private mode: the screen falls back to the login form */ }
}

/** Raw stored value, for useSyncExternalStore (snapshots must be referentially stable, so parse separately). */
export function readPendingVerificationRaw(): string | null {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

export function parsePendingVerification(raw: string | null): PendingVerification | null {
  try {
    const parsed = JSON.parse(raw ?? "null");
    return parsed && typeof parsed.email === "string" && typeof parsed.pollToken === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingVerification() {
  try { sessionStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
