"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRedirectIfSignedIn } from "@/components/AuthProvider";
import { LiquidGlassButton } from "@/components/LiquidGlassSurface";

export default function LoginPage() {
  const router = useRouter();
  useRedirectIfSignedIn();
  const [leaving, setLeaving] = useState(false);

  function continueWith(mode: "signup" | "signin") {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => router.push(`/auth-options/${mode}`), 220);
  }

  return (
    <main className="relative h-full w-full">
      <section aria-label="Create an account or sign in" className={`absolute inset-x-0 bottom-10 px-6 transition-[opacity,transform] duration-200 ease-in lg:hidden ${leaving ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"} motion-reduce:transition-none`}>
        <h1 className="mb-8 text-center text-[28px] font-semibold leading-tight tracking-[-.045em] text-white [text-shadow:0_2px_20px_#0008]">Welcome to RVNext Gen</h1>
        <div className="flex w-full flex-col gap-3">
          <button type="button" onClick={() => continueWith("signup")} className="flex h-16 w-full items-center justify-center rounded-full bg-white px-5 text-md leading-[14px] font-medium text-[#0e0d0f] transition-colors hover:bg-white/90">Create Account</button>
          <button type="button" onClick={() => continueWith("signin")} className="flex h-16 w-full items-center justify-center rounded-full border border-[#777] bg-transparent px-5 text-md leading-[14px] font-medium text-white/65 transition-colors hover:bg-white/8 hover:text-white">Log In</button>
        </div>
      </section>
      <section aria-label="Create an account or sign in" className={`hidden h-full w-full items-center justify-center px-6 text-white lg:flex transition-[opacity,transform] duration-[360ms] ease-[cubic-bezier(.22,1,.36,1)] ${leaving ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"} motion-reduce:transition-none`}>
        <div className="w-full max-w-[410px] text-center">
          <h1 className="mb-9 text-[32px] font-semibold tracking-[-.045em] [text-shadow:0_2px_20px_#0008]">Welcome to RVNext Gen</h1>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => continueWith("signup")} className="flex h-[50px] w-full items-center justify-center rounded-full bg-white px-5 text-[15px] font-semibold text-[#0e0d0f] transition-[background-color,transform] duration-150 hover:bg-white/90 active:scale-[.985] motion-reduce:transition-none">Create Account</button>
            <LiquidGlassButton type="button" fullWidth onClick={() => continueWith("signin")} className="flex h-[50px] w-full items-center justify-center rounded-full px-5 text-[15px] font-medium text-white">Log In</LiquidGlassButton>
          </div>
        </div>
      </section>
    </main>
  );
}
