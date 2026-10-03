"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from 'lucide-react';
import AppleIcon from '@mui/icons-material/Apple';
import GoogleIcon from '@mui/icons-material/Google';
import { useEffect, useState } from "react";
import { useRedirectIfSignedIn } from "./AuthProvider";

const GOOGLE_ERRORS: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  google_unverified: "That Google account has no verified email, so it can’t be used to sign in.",
  google_unavailable: "Google sign-in isn’t available right now.",
  google_failed: "Google sign-in failed. Please try again.",
};

export default function AuthOptions({ mode, error }: { mode: "signup" | "signin"; error?: string }) {
  const isSignup = mode === "signup";
  const emailHref = isSignup ? "/signup" : "/signin";
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

  // The backend runs the whole OAuth flow: it redirects to Google, handles the callback, then sends the browser back here.
  function continueWithGoogle() {
    if (redirecting) return;
    setRedirecting(true);
    // Full-page navigation to the backend origin (not an internal Next.js route).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/auth/google/start`;
  }

  return (
    <main className="relative h-full w-full text-white">
      <Link href="/login" className="absolute top-5 left-6 z-10 grid size-12 place-items-center rounded-full bg-black/25 text-xl leading-none text-white/80 backdrop-blur-md" aria-label="Back to welcome"><ChevronLeft /></Link>
      <section aria-label="Choose how to continue" className={`absolute inset-x-0 bottom-10 px-6 transition-[opacity,transform] duration-300 ${leaving ? "translate-y-1 opacity-0 ease-in" : entered ? "translate-y-0 opacity-100 ease-out delay-100" : "translate-y-3 opacity-0 ease-out"} motion-reduce:transition-none`}>
        <div className="flex w-full flex-col gap-3">
          <button type="button" onClick={continueWithGoogle} disabled={redirecting} className="flex h-16 w-full items-center justify-center rounded-full border border-[#777] bg-transparent px-5 text-md font-medium text-white/75 transition-colors hover:bg-white/8 hover:text-white gap-2 disabled:opacity-60"><GoogleIcon />Continue with Google</button>
          <button type="button" className="flex h-16 w-full items-center justify-center rounded-full border border-[#777] bg-transparent px-5 text-md font-medium text-white/75 transition-colors hover:bg-white/8 hover:text-white gap-2"><AppleIcon />Continue with Apple</button>
          <button type="button" onClick={continueWithEmail} className="flex h-16 w-full items-center justify-center rounded-full bg-white px-5 text-md font-medium text-[#0e0d0f] transition-colors hover:bg-white/90">Continue with Email</button>
        </div>
        {error && <p role="alert" className="mt-4 text-center text-[13px] text-[#ff8f8f]">{GOOGLE_ERRORS[error] ?? GOOGLE_ERRORS.google_failed}</p>}
        <p className="mt-5 text-center text-xs leading-relaxed text-white/60">
          By tapping Continue, you agree to our<br />
          <Link href="/terms" className="font-medium text-white/85 hover:text-white">Terms</Link> and{" "}
          <Link href="/privacy" className="font-medium text-white/85 hover:text-white">Privacy Policy</Link>
        </p>
      </section>
    </main>
  );
}
