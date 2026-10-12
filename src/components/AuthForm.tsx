"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff, LockKeyhole, Mail, User } from "lucide-react";
import GoogleIcon from "@mui/icons-material/Google";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, authApi, type Session } from "@/lib/api";
import { savePendingVerification } from "@/lib/pending-verification";
import { useAuth, useRedirectIfSignedIn } from "./AuthProvider";
import { LiquidGlassButton, LiquidGlassSurface } from "./LiquidGlassSurface";

const fieldClass = "relative flex h-16 items-center gap-3 rounded-full px-4 text-white/80";
const inputClass = "h-full min-w-0 flex-1 bg-transparent text-md leading-5 text-white outline-none placeholder:text-white/55";

type Notice = { tone: "error" | "info"; text: string; resend?: boolean };

export default function AuthForm({ mode, initialEmail = "", providerError }: { mode: "signup" | "signin"; initialEmail?: string; providerError?: string }) {
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
  const [googleRedirecting, setGoogleRedirecting] = useState(false);
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

  function continueWithGoogle() {
    if (googleRedirecting) return;
    setGoogleRedirecting(true);
    // OAuth starts on the backend origin and must perform a full-page navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}/api/auth/google/start`;
  }

  return (
    <>
    <main className="relative h-full w-full overflow-y-auto text-white lg:hidden">
      <LiquidGlassSurface className="absolute top-5 left-6 z-10 rounded-full"><Link href={isSignup ? "/auth-options/signup" : "/auth-options/signin"} className="grid size-12 place-items-center rounded-full text-white" aria-label="Back to sign-in options"><ChevronLeft className="size-6" /></Link></LiquidGlassSurface>
      <section className={`absolute inset-x-0 bottom-10 px-6 transition-[opacity,transform] duration-500 ease-out delay-100 ${entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"} motion-reduce:transition-none`}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {isSignup && (
            <LiquidGlassSurface className="auth-field-glass rounded-full" regular>
            <label className={fieldClass}>
              <User className="size-5 shrink-0" strokeWidth={1.8} /><span className="sr-only">Name</span>
              <input required minLength={2} maxLength={120} type="text" autoComplete="name" name="name" placeholder="Name" value={name} onChange={event => setName(event.target.value)} className={inputClass} />
            </label>
            </LiquidGlassSurface>
          )}
          <LiquidGlassSurface className="auth-field-glass rounded-full" regular>
          <label className={fieldClass}>
            <Mail className="size-5 shrink-0" strokeWidth={1.8} /><span className="sr-only">Email</span>
            <input required type="email" autoComplete="email" name="email" placeholder="Email" value={email} onChange={event => setEmail(event.target.value)} className={inputClass} />
          </label>
          </LiquidGlassSurface>
          <LiquidGlassSurface className="auth-field-glass rounded-full" regular>
          <label className={fieldClass}>
            <LockKeyhole className="size-5 shrink-0" strokeWidth={1.8} /><span className="sr-only">Password</span>
            <input required minLength={isSignup ? 12 : 1} type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} name="password" placeholder="Password" value={password} onChange={event => setPassword(event.target.value)} className={inputClass} />
            <button type="button" onClick={() => setShowPassword(visible => !visible)} className="grid size-7 shrink-0 place-items-center rounded-full bg-transparent text-white/50 hover:text-white/80" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-[19px]" strokeWidth={1.8} /> : <Eye className="size-[19px]" strokeWidth={1.8} />}</button>
          </label>
          </LiquidGlassSurface>
          {isSignup && <p className="px-4 text-[12px] text-white/45">At least 12 characters, with a lowercase letter, an uppercase letter and a number.</p>}
          <button type="submit" disabled={busy} className="mt-2 flex h-16 w-full items-center justify-center rounded-full bg-white px-5 text-md font-medium text-[#0e0d0f] transition-colors hover:bg-white/90 disabled:opacity-60">{busy ? (isSignup ? "Creating account…" : "Logging in…") : isSignup ? "Create Account" : "Log In"}</button>
        </form>
        {notice && (
          <p role={notice.tone === "info" ? "status" : "alert"} className={`mt-4 text-center text-[13px] ${notice.tone === "info" ? "text-white/70" : "text-[#ff8f8f]"}`}>
            {notice.text}
            {notice?.resend && <> <button type="button" onClick={resend} className="bg-transparent font-semibold text-white underline underline-offset-4">Resend email</button></>}
          </p>
        )}
        <p className="mt-5 text-center text-[14px] text-white/55">
          {isSignup ? "Already have an account? " : "New to RVNext Gen? "}
          <Link href={isSignup ? "/auth-options/signin" : "/auth-options/signup"} className="font-semibold text-white underline underline-offset-4">{isSignup ? "Log in" : "Create account"}</Link>
        </p>
      </section>
    </main>
    <main className="hidden h-full w-full overflow-y-auto px-6 py-10 text-white lg:flex lg:items-start lg:justify-start">
      <LiquidGlassSurface className="absolute top-5 left-6 z-10 rounded-full"><Link href={isSignup ? "/auth-options/signup" : "/auth-options/signin"} className="grid size-12 place-items-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-white" aria-label="Back to sign-in options"><ChevronLeft className="size-6" /></Link></LiquidGlassSurface>
      <section aria-label={isSignup ? "Create your account" : "Log in to RVNext Gen"} className={`mx-auto my-auto w-full max-w-[410px] py-5 transition-[opacity,transform] duration-[360ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
        <h1 className="mb-9 text-center text-[32px] font-semibold leading-tight tracking-[-.045em] text-white [text-shadow:0_2px_20px_#0008]">
          {isSignup ? "Create your account" : "Log in to RVNext Gen"}
        </h1>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {isSignup && <label className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-white/85">Full name <span aria-hidden="true">*</span></span>
            <LiquidGlassSurface className="auth-field-glass rounded-full" regular><span className="flex h-[50px] items-center rounded-full px-5">
              <input required minLength={2} maxLength={120} type="text" autoComplete="name" name="name" placeholder="Your name" value={name} onChange={event => setName(event.target.value)} className="h-full w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/65" />
            </span></LiquidGlassSurface>
          </label>}
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-white/85">Email <span aria-hidden="true">*</span></span>
            <LiquidGlassSurface className="auth-field-glass rounded-full" regular><span className="flex h-[50px] items-center rounded-full px-5">
              <input required type="email" autoComplete="email" name="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} className="h-full w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/65" />
            </span></LiquidGlassSurface>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-white/85">Password <span aria-hidden="true">*</span></span>
            <LiquidGlassSurface className="auth-field-glass rounded-full" regular><span className="flex h-[50px] items-center rounded-full pr-2 pl-5">
              <input required minLength={isSignup ? 12 : 1} type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} name="password" placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/65" />
              <button type="button" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="grid size-11 shrink-0 place-items-center rounded-full text-white/75 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{showPassword ? <EyeOff className="size-5" strokeWidth={1.7} /> : <Eye className="size-5" strokeWidth={1.7} />}</button>
            </span></LiquidGlassSurface>
          </label>
          {isSignup && <p className="-mt-1 px-1 text-xs leading-relaxed text-white/75">Use at least 12 characters with uppercase and lowercase letters and a number.</p>}
          <button type="submit" disabled={busy} className="mt-1 flex h-[50px] w-full items-center justify-center gap-3 rounded-full bg-white px-5 text-[15px] font-semibold text-[#0e0d0f] transition-[background-color,transform] duration-150 hover:bg-white/90 active:scale-[.985] disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            {busy ? (isSignup ? "Creating account…" : "Logging in…") : isSignup ? "Create Account" : "Log In"}
            {!busy && <span aria-hidden="true" className="text-black/45">→</span>}
          </button>
        </form>
        {(notice || providerError) && <p role={notice?.tone === "info" && !providerError ? "status" : "alert"} className={`mt-4 rounded-xl bg-black/35 px-3 py-2 text-center text-[13px] leading-relaxed ${notice?.tone === "info" && !providerError ? "text-white/90" : "text-[#ffb5b5]"}`}>
          {notice?.text ?? providerError}
          {notice?.resend && <> <button type="button" onClick={resend} className="font-semibold text-white underline underline-offset-4">Resend email</button></>}
        </p>}
        <p className="mt-4 text-center text-[13px] text-white/75">
          {isSignup ? "Already have an account? " : "New to RVNext Gen? "}
          <Link href={isSignup ? "/auth-options/signin" : "/auth-options/signup"} className="font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{isSignup ? "Log in" : "Create account"}</Link>
        </p>
        <div className="my-6 flex items-center gap-4" aria-hidden="true"><span className="h-px flex-1 bg-white/25" /><span className="text-[11px] font-medium tracking-[.16em] text-white/75">OR</span><span className="h-px flex-1 bg-white/25" /></div>
        <LiquidGlassButton type="button" fullWidth onClick={continueWithGoogle} disabled={googleRedirecting} className="flex h-[50px] w-full items-center justify-center gap-3 rounded-full px-5 text-[14px] font-medium text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <GoogleIcon className="!size-[18px]" />{googleRedirecting ? "Connecting to Google…" : "Continue with Google"}
        </LiquidGlassButton>
      </section>
    </main>
    </>
  );
}
