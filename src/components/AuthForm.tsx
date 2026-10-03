"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff, LockKeyhole, Mail, User } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, authApi, type Session } from "@/lib/api";
import { savePendingVerification } from "@/lib/pending-verification";
import { useAuth, useRedirectIfSignedIn } from "./AuthProvider";

const fieldClass = "relative flex h-16 items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-4 text-white/55 transition-colors focus-within:border-white/35";
const inputClass = "h-full min-w-0 flex-1 bg-transparent text-md leading-5 text-white outline-none placeholder:text-white/55";

type Notice = { tone: "error" | "info"; text: string; resend?: boolean };

export default function AuthForm({ mode, initialEmail = "" }: { mode: "signup" | "signin"; initialEmail?: string }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const { signIn } = useAuth();
  useRedirectIfSignedIn();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    const address = email.trim();
    try {
      if (isSignup) {
        const { pollToken } = await authApi<{ pollToken: string }>("register", { name: name.trim(), email: address, password });
        savePendingVerification({ email: address, pollToken });
        router.push("/verify-pending");
        return;
      }
      signIn(await authApi<Session>("login", { email: address, password }));
      router.replace("/");
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      const text = error instanceof Error ? error.message : "Something went wrong. Try again.";
      if (!isSignup && status === 403) setNotice({ tone: "error", text: "Your email isn’t verified yet. Open the verification link we sent you, then log in.", resend: true });
      else setNotice({ tone: "error", text });
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await authApi("resend-verification", { email: email.trim() });
      setNotice({ tone: "info", text: "We sent a new verification link. Check your inbox." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not resend the link." });
    }
  }

  return (
    <main className="relative h-full w-full overflow-y-auto px-6 pb-10 text-white">
      <Link href={isSignup ? "/auth-options/signup" : "/auth-options/signin"} className="absolute top-5 left-6 z-10 grid size-12 place-items-center rounded-full bg-black/25 text-white/80 backdrop-blur-md" aria-label="Back to sign-in options"><ChevronLeft className="size-6" /></Link>
      <section className={`absolute inset-x-0 bottom-10 px-6 transition-[opacity,transform] duration-500 ease-out delay-100 ${entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"} motion-reduce:transition-none`}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {isSignup && (
            <label className={fieldClass}>
              <User className="size-5 shrink-0" strokeWidth={1.8} /><span className="sr-only">Name</span>
              <input required minLength={2} maxLength={120} type="text" autoComplete="name" name="name" placeholder="Name" value={name} onChange={event => setName(event.target.value)} className={inputClass} />
            </label>
          )}
          <label className={fieldClass}>
            <Mail className="size-5 shrink-0" strokeWidth={1.8} /><span className="sr-only">Email</span>
            <input required type="email" autoComplete="email" name="email" placeholder="Email" value={email} onChange={event => setEmail(event.target.value)} className={inputClass} />
          </label>
          <label className={fieldClass}>
            <LockKeyhole className="size-5 shrink-0" strokeWidth={1.8} /><span className="sr-only">Password</span>
            <input required minLength={isSignup ? 12 : 1} type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} name="password" placeholder="Password" value={password} onChange={event => setPassword(event.target.value)} className={inputClass} />
            <button type="button" onClick={() => setShowPassword(visible => !visible)} className="grid size-7 shrink-0 place-items-center rounded-full bg-transparent text-white/50 hover:text-white/80" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-[19px]" strokeWidth={1.8} /> : <Eye className="size-[19px]" strokeWidth={1.8} />}</button>
          </label>
          {isSignup && <p className="px-4 text-[12px] text-white/45">At least 12 characters, with a lowercase letter, an uppercase letter and a number.</p>}
          <button type="submit" disabled={busy} className="mt-2 flex h-16 w-full items-center justify-center rounded-full bg-white px-5 text-md font-medium text-[#0e0d0f] transition-colors hover:bg-white/90 disabled:opacity-60">{busy ? (isSignup ? "Creating account…" : "Logging in…") : isSignup ? "Create Account" : "Log In"}</button>
        </form>
        {notice && (
          <p role={notice.tone === "error" ? "alert" : "status"} className={`mt-4 text-center text-[13px] ${notice.tone === "error" ? "text-[#ff8f8f]" : "text-white/70"}`}>
            {notice.text}
            {notice.resend && <> <button type="button" onClick={resend} className="bg-transparent font-semibold text-white underline underline-offset-4">Resend email</button></>}
          </p>
        )}
        <p className="mt-5 text-center text-[14px] text-white/55">
          {isSignup ? "Already have an account? " : "New to Streamline? "}
          <Link href={isSignup ? "/auth-options/signin" : "/auth-options/signup"} className="font-semibold text-white underline underline-offset-4">{isSignup ? "Log in" : "Create account"}</Link>
        </p>
      </section>
    </main>
  );
}
