"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, MailCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { authApi, type Session } from "@/lib/api";
import { clearPendingVerification, parsePendingVerification, readPendingVerificationRaw } from "@/lib/pending-verification";
import { useAuth } from "./AuthProvider";

const POLL_MS = 3000;
const RESEND_COOLDOWN_S = 30;
type PollResult = ({ status: "verified" } & Session) | { status: "pending" };

/** Shown after sign-up. Signs the user in as soon as the emailed link is opened, in this tab or any other device. */
export default function VerifyPending() {
  const router = useRouter();
  const { status, signIn } = useAuth();
  // undefined on the server / first render, then the stored value (or null when there is none).
  const raw = useSyncExternalStore(() => () => undefined, readPendingVerificationRaw, () => undefined);
  const ready = raw !== undefined;
  const pending = useMemo(() => parsePendingVerification(raw ?? null), [raw]);
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const polling = useRef(false);

  // The link was opened in another tab of this browser: the shared cookie already holds a session.
  useEffect(() => {
    if (status !== "authed") return;
    clearPendingVerification();
    router.replace("/");
  }, [status, router]);

  const poll = useCallback(async (token: string) => {
    if (polling.current) return;
    polling.current = true;
    try {
      const result = await authApi<PollResult>("verification-status", { pollToken: token });
      if (result.status === "verified") {
        clearPendingVerification();
        signIn(result);
        router.replace("/");
      }
    } catch (error) {
      // 401 means the link expired or the session was already handed out; anything else is a blip, so keep polling.
      if ((error as { status?: number }).status === 401) setExpired(true);
    } finally {
      polling.current = false;
    }
  }, [router, signIn]);

  useEffect(() => {
    if (!pending || expired) return;
    const id = window.setInterval(() => void poll(pending.pollToken), POLL_MS);
    return () => window.clearInterval(id);
  }, [pending, expired, poll]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown(seconds => seconds - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  async function resend() {
    if (!pending || cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN_S);
    try {
      await authApi("resend-verification", { email: pending.email, pollToken: pending.pollToken });
      setMessage("We sent a new link. The previous one no longer works.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resend the link.");
    }
  }

  if (!ready) return null;
  const email = pending?.email ?? "";
  const loginHref = email ? `/signin?email=${encodeURIComponent(email)}` : "/signin";

  return (
    <main className="relative h-full w-full overflow-y-auto px-6 pb-10 text-white">
      <Link href="/signup" className="absolute top-5 left-6 z-10 grid size-12 place-items-center rounded-full bg-black/25 text-white/80 backdrop-blur-md" aria-label="Back to create account"><ChevronLeft className="size-6" /></Link>
      <section className="absolute inset-x-0 bottom-10 px-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-full border border-white/15 bg-white/[0.06]"><MailCheck className="size-7" strokeWidth={1.6} /></span>
          <h1 className="text-2xl font-semibold">Verify your email</h1>
          {pending && !expired ? (
            <p className="text-[15px] leading-relaxed text-white/65">We sent a verification link to<br /><span className="font-semibold text-white">{email}</span>.<br />Open it to finish creating your account. You’ll be signed in automatically.</p>
          ) : (
            <p className="text-[15px] leading-relaxed text-white/65">{expired ? "This verification session has expired. Log in to get a new link." : "Open the verification link we emailed you, or log in to get a new one."}</p>
          )}
        </div>
        {message && <p role="status" className="mt-4 text-center text-[13px] text-white/70">{message}</p>}
        <Link href={loginHref} className="mt-6 flex h-16 w-full items-center justify-center rounded-full bg-white px-5 text-md font-medium text-[#0e0d0f] transition-colors hover:bg-white/90">Log In</Link>
        {pending && (
          <button type="button" onClick={resend} disabled={cooldown > 0} className="mt-3 flex h-12 w-full items-center justify-center rounded-full bg-transparent text-[14px] font-medium text-white/65 hover:text-white disabled:opacity-50">
            {cooldown > 0 ? `Resend email in ${cooldown}s` : "Didn’t get it? Resend email"}
          </button>
        )}
      </section>
    </main>
  );
}
