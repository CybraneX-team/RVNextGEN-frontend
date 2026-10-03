"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useRedirectIfSignedIn } from "@/components/AuthProvider";

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
      <section aria-label="Create an account or sign in" className={`absolute inset-x-0 bottom-10 px-6 transition-[opacity,transform] duration-200 ease-in ${leaving ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"} motion-reduce:transition-none`}>
        <div className="flex w-full flex-col gap-3">
          <button type="button" onClick={() => continueWith("signup")} className="flex h-16 w-full items-center justify-center rounded-full bg-white px-5 text-md leading-[14px] font-medium text-[#0e0d0f] transition-colors hover:bg-white/90">Create Account</button>
          <button type="button" onClick={() => continueWith("signin")} className="flex h-16 w-full items-center justify-center rounded-full border border-[#777] bg-transparent px-5 text-md leading-[14px] font-medium text-white/65 transition-colors hover:bg-white/8 hover:text-white">Log In</button>
        </div>
      </section>
    </main>
  );
}
