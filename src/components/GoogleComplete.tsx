"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authApi, type Session } from "@/lib/api";
import { useAuth } from "./AuthProvider";

/** Where the backend sends the browser after Google sign-in: swaps the one-time ticket for a session. */
export default function GoogleComplete({ ticket }: { ticket: string }) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [error, setError] = useState(ticket ? "" : "This sign-in link is incomplete.");
  const started = useRef(false);

  useEffect(() => {
    if (!ticket || started.current) return; // single-use ticket: never send it twice (React strict mode runs effects twice)
    started.current = true;
    authApi<Session>("google/exchange", { ticket })
      .then(session => { signIn(session); router.replace("/"); })
      .catch(failure => setError(failure instanceof Error ? failure.message : "Google sign-in failed."));
  }, [ticket, signIn, router]);

  return (
    <main className="relative h-full w-full px-6 text-white">
      <section className="absolute inset-x-0 bottom-10 px-6" aria-live="polite">
        <div className="flex flex-col items-center gap-3 text-center">
          {error ? <CircleAlert className="size-12 text-[#ff8f8f]" strokeWidth={1.6} /> : <LoaderCircle className="size-12 animate-spin text-white/70" strokeWidth={1.6} />}
          <h1 className="text-2xl font-semibold">{error ? "Google sign-in failed" : "Signing you in…"}</h1>
          <p className="text-[15px] leading-relaxed text-white/65">{error ? `${error.replace(/\.?$/, ".")} Please try again.` : "Hold on a moment."}</p>
        </div>
        {error && <Link href="/auth-options/signin" className="mt-6 flex h-16 w-full items-center justify-center rounded-full bg-white px-5 text-md font-medium text-[#0e0d0f] transition-colors hover:bg-white/90">Back to sign in</Link>}
      </section>
    </main>
  );
}
