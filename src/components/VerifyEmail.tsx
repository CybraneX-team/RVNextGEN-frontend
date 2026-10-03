"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authApi, type Session } from "@/lib/api";
import { clearPendingVerification } from "@/lib/pending-verification";
import { useAuth } from "./AuthProvider";

/** Landing page for the emailed verification link: verifies, signs the user in, and opens the app. */
export default function VerifyEmail({ token }: { token: string }) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [state, setState] = useState<{ phase: "working" | "done" | "failed"; message?: string }>(
    token ? { phase: "working" } : { phase: "failed", message: "This verification link is incomplete." },
  );
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return; // the link is single-use, so never send it twice
    started.current = true;
    authApi<Session>("verify-email", { token })
      .then(session => {
        clearPendingVerification();
        signIn(session);
        setState({ phase: "done" });
        router.replace("/");
      })
      .catch(error => setState({ phase: "failed", message: error instanceof Error ? error.message : "Could not verify your email." }));
  }, [token, signIn, router]);

  const Icon = state.phase === "done" ? CircleCheck : state.phase === "failed" ? CircleAlert : LoaderCircle;
  return (
    <main className="relative h-full w-full px-6 text-white">
      <section className="absolute inset-x-0 bottom-10 px-6" aria-live="polite">
        <div className="flex flex-col items-center gap-3 text-center">
          <Icon className={`size-12 ${state.phase === "working" ? "animate-spin text-white/70" : state.phase === "done" ? "text-[#a2d9cf]" : "text-[#ff8f8f]"}`} strokeWidth={1.6} />
          <h1 className="text-2xl font-semibold">{state.phase === "working" ? "Verifying your email…" : state.phase === "done" ? "Email verified" : "Verification failed"}</h1>
          <p className="text-[15px] leading-relaxed text-white/65">
            {state.phase === "working" ? "Hold on a moment." : state.phase === "done" ? "Signing you in…" : `${state.message?.replace(/\.?$/, ".")} Log in to request a new link.`}
          </p>
        </div>
        {state.phase === "failed" && (
          <Link href="/signin" className="mt-6 flex h-16 w-full items-center justify-center rounded-full bg-white px-5 text-md font-medium text-[#0e0d0f] transition-colors hover:bg-white/90">Log In</Link>
        )}
      </section>
    </main>
  );
}
