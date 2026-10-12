"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import AppleIcon from "@mui/icons-material/Apple";
import GoogleIcon from "@mui/icons-material/Google";
import { useEffect, useState } from "react";
import { useRedirectIfSignedIn } from "./AuthProvider";
import { LiquidGlassButton, LiquidGlassSurface } from "./LiquidGlassSurface";

const GOOGLE_ERRORS: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_unverified: "That Google account has no verified email, so it can’t be used to sign in.",
  google_unavailable: "Google sign-in isn’t available right now.",
  google_failed: "Google sign-in failed. Please try again.",
};

export default function AuthOptions({ mode, error }: { mode: "signup" | "signin"; error?: string }) {
  const emailHref = mode === "signup" ? "/signup" : "/signin";
  const router = useRouter();
  useRedirectIfSignedIn();
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function continueWithEmail() {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => router.push(emailHref), 300);
  }

  function continueWithGoogle() {
    if (redirecting) return;
    setRedirecting(true);
    // OAuth begins on the backend origin.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/auth/google/start`;
  }

  return (
    <main className="relative h-full w-full text-white lg:flex lg:items-center lg:justify-center lg:px-6">
      <LiquidGlassSurface className="absolute top-5 left-6 z-10 rounded-full"><Link href="/login" className="grid size-12 place-items-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-white" aria-label="Back to welcome"><ChevronLeft /></Link></LiquidGlassSurface>
      <section aria-label="Choose how to continue" className={`absolute inset-x-0 bottom-10 px-6 transition-[opacity,transform] duration-300 lg:static lg:w-full lg:max-w-[410px] lg:px-0 lg:duration-[360ms] lg:ease-[cubic-bezier(.22,1,.36,1)] ${leaving ? "translate-y-1 opacity-0 ease-in" : entered ? "translate-y-0 opacity-100 ease-out delay-100" : "translate-y-3 opacity-0 ease-out"} motion-reduce:transition-none`}>
        <h1 className="mb-9 hidden text-center text-[32px] font-semibold tracking-[-.045em] [text-shadow:0_2px_20px_#0008] lg:block">{mode === "signup" ? "Create your account" : "Log in to RVNext Gen"}</h1>
        <div className="flex w-full flex-col gap-3">
          <LiquidGlassButton type="button" fullWidth onClick={continueWithGoogle} disabled={redirecting} className="flex h-16 w-full items-center justify-center gap-2 rounded-full px-5 text-md font-medium text-white disabled:opacity-60 lg:h-[50px] lg:text-[15px]"><GoogleIcon />{redirecting ? "Connecting to Google…" : "Continue with Google"}</LiquidGlassButton>
          <LiquidGlassButton type="button" fullWidth className="flex h-16 w-full items-center justify-center gap-2 rounded-full px-5 text-md font-medium text-white lg:h-[50px] lg:text-[15px]"><AppleIcon />Continue with Apple</LiquidGlassButton>
          <button type="button" onClick={continueWithEmail} className="flex h-16 w-full items-center justify-center rounded-full bg-white px-5 text-md font-medium text-[#0e0d0f] transition-colors hover:bg-white/90 lg:h-[50px] lg:text-[15px] lg:font-semibold">Continue with Email</button>
        </div>
        {error && <p role="alert" className="mt-4 text-center text-[13px] text-[#ff8f8f]">{GOOGLE_ERRORS[error] ?? GOOGLE_ERRORS.google_failed}</p>}
        <p className="mt-5 text-center text-xs leading-relaxed text-white/60 lg:text-white/75">
          By tapping Continue, you agree to our<br />
          <Link href="/terms" className="font-medium text-white/85 hover:text-white">Terms</Link> and{" "}
          <Link href="/privacy" className="font-medium text-white/85 hover:text-white">Privacy Policy</Link>
        </p>
      </section>
    </main>
  );
}
