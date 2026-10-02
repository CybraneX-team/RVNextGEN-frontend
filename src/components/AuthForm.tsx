"use client";

import Link from "next/link";
import { ChevronLeft, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useEffect, useState } from "react";

export default function AuthForm({ mode }: { mode: "signup" | "signin" }) {
  const isSignup = mode === "signup";
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="relative h-full w-full overflow-y-auto px-6 pb-10 text-white">
      <Link href={isSignup ? "/auth-options/signup" : "/auth-options/signin"} className="absolute top-5 left-6 z-10 grid size-12 place-items-center rounded-full bg-black/25 text-white/80 backdrop-blur-md" aria-label="Back to sign-in options"><ChevronLeft className="size-6" /></Link>
      <section className={`absolute inset-x-0 bottom-10 px-6 transition-[opacity,transform] duration-500 ease-out delay-100 ${entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"} motion-reduce:transition-none`}>
        <form onSubmit={event => { event.preventDefault(); setNotice("Authentication isn’t connected yet."); }} className="flex flex-col gap-3">
          <label className="relative flex h-16 items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-4 text-white/55 transition-colors focus-within:border-white/35">
            <Mail className="size-5 shrink-0" strokeWidth={1.8} /><span className="sr-only">Email</span><input required type="email" autoComplete="email" name="email" placeholder="Email" className="h-full min-w-0 flex-1 bg-transparent text-md leading-5 text-white outline-none placeholder:text-white/55" />
          </label>
          <label className="relative flex h-16 items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-4 text-white/55 transition-colors focus-within:border-white/35">
            <LockKeyhole className="size-5 shrink-0" strokeWidth={1.8} /><span className="sr-only">Password</span><input required type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} name="password" placeholder="Password" className="h-full min-w-0 flex-1 bg-transparent text-md leading-5 text-white outline-none placeholder:text-white/55" />
            <button type="button" onClick={() => setShowPassword(visible => !visible)} className="grid size-7 shrink-0 place-items-center rounded-full bg-transparent text-white/50 hover:text-white/80" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-[19px]" strokeWidth={1.8} /> : <Eye className="size-[19px]" strokeWidth={1.8} />}</button>
          </label>
          <button type="submit" className="mt-2 flex h-16 w-full items-center justify-center rounded-full bg-white px-5 text-md font-medium text-[#0e0d0f] transition-colors hover:bg-white/90">{isSignup ? "Create Account" : "Log In"}</button>
        </form>
        {notice && <p role="status" className="mt-4 text-center text-[13px] text-white/55">{notice}</p>}
        <p className="mt-5 text-center text-[14px] text-white/55">
          {isSignup ? "Already have an account? " : "New to Streamline? "}
          <Link href={isSignup ? "/auth-options/signin" : "/auth-options/signup"} className="font-semibold text-white underline underline-offset-4">{isSignup ? "Log in" : "Create account"}</Link>
        </p>
      </section>
    </main>
  );
}
