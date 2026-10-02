"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from 'lucide-react';
import AppleIcon from '@mui/icons-material/Apple';
import GoogleIcon from '@mui/icons-material/Google';
import { useEffect, useState } from "react";

export default function AuthOptions({ mode }: { mode: "signup" | "signin" }) {
  const isSignup = mode === "signup";
  const emailHref = isSignup ? "/signup" : "/signin";
  const router = useRouter();
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function continueWithEmail() {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => router.push(emailHref), 300);
  }

  return (
    <main className="relative h-full w-full text-white">
      <Link href="/login" className="absolute top-5 left-6 z-10 grid size-12 place-items-center rounded-full bg-black/25 text-xl leading-none text-white/80 backdrop-blur-md" aria-label="Back to welcome"><ChevronLeft /></Link>
      <section aria-label="Choose how to continue" className={`absolute inset-x-0 bottom-10 px-6 transition-[opacity,transform] duration-300 ${leaving ? "translate-y-1 opacity-0 ease-in" : entered ? "translate-y-0 opacity-100 ease-out delay-100" : "translate-y-3 opacity-0 ease-out"} motion-reduce:transition-none`}>
        <div className="flex w-full flex-col gap-3">
          <button type="button" className="flex h-16 w-full items-center justify-center rounded-full border border-[#777] bg-transparent px-5 text-md font-medium text-white/75 transition-colors hover:bg-white/8 hover:text-white gap-2"><GoogleIcon />Continue with Google</button>
          <button type="button" className="flex h-16 w-full items-center justify-center rounded-full border border-[#777] bg-transparent px-5 text-md font-medium text-white/75 transition-colors hover:bg-white/8 hover:text-white gap-2"><AppleIcon />Continue with Apple</button>
          <button type="button" onClick={continueWithEmail} className="flex h-16 w-full items-center justify-center rounded-full bg-white px-5 text-md font-medium text-[#0e0d0f] transition-colors hover:bg-white/90">Continue with Email</button>
        </div>
        <p className="mt-5 text-center text-xs leading-relaxed text-white/60">
          By tapping Continue, you agree to our<br />
          <Link href="/terms" className="font-medium text-white/85 hover:text-white">Terms</Link> and{" "}
          <Link href="/privacy" className="font-medium text-white/85 hover:text-white">Privacy Policy</Link>
        </p>
      </section>
    </main>
  );
}
