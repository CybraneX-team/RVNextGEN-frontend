"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, AuthGate } from "@/components/AuthProvider";
import { useState } from "react";

function ProfileContent() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [imageFailed, setImageFailed] = useState(false);
  const initials = (user?.displayName?.trim().split(/\s+/).slice(0, 2).map(name => name[0]).join("") || user?.email?.[0] || "U").toUpperCase();

  async function logout() {
    await signOut();
    router.replace("/login");
  }

  return <main className="relative min-h-dvh overflow-hidden bg-[#0e0d0f] px-4 pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] text-white sm:px-6">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(49,86,68,.42)_0%,transparent_38%),radial-gradient(ellipse_at_95%_48%,rgba(123,66,35,.10),transparent_38%)]" />
    <div className="relative mx-auto w-full max-w-lg">
      <header className="flex h-12 items-center gap-3">
        <button type="button" onClick={() => {
          let returnPath = "/";
          try {
            const saved = sessionStorage.getItem("profile-return-path");
            if (saved?.startsWith("/") && !saved.startsWith("//") && !saved.startsWith("/profile")) returnPath = saved;
            sessionStorage.removeItem("profile-return-path");
          } catch { /* Use the gyro page as the fallback. */ }
          router.back();
          window.setTimeout(() => {
            if (window.location.pathname === "/profile") router.replace(returnPath);
          }, 400);
        }} aria-label="Go back" className="grid size-11 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[.035] text-white/90 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5"><path d="m14 6-6 6 6 6" /></svg>
        </button>
        <span className="text-[14px] font-semibold tracking-[-.2px] text-white/85">Profile</span>
      </header>
      <section className="mt-8 flex flex-col items-center rounded-[26px] border border-white/[.07] bg-[linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.012))] px-5 pb-7 pt-7 text-center shadow-[0_24px_80px_#0004] sm:mt-10 sm:px-8 sm:pb-9 sm:pt-9">
        <div className="mb-5 grid size-[92px] place-items-center rounded-full bg-[linear-gradient(135deg,#e5b27f,#804727)] p-[2px] shadow-[0_10px_40px_rgba(229,178,127,.13)] sm:size-[104px]">
          <div className="grid size-full place-items-center overflow-hidden rounded-full border border-black/20 bg-[#27201e] text-[28px] font-semibold text-[#f4dfca] sm:text-[32px]">
            {user?.avatarUrl && !imageFailed ? <img src={user.avatarUrl} alt="Profile photo" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="size-full object-cover" /> : initials}
          </div>
        </div>
        <span className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#e5b27f]/70">Your account</span>
        <h1 className="max-w-full break-words text-[24px] leading-tight font-semibold tracking-[-.6px] sm:text-[28px]">{user?.displayName || "Your profile"}</h1>
        <p className="mt-2 max-w-full break-all text-[13px] text-white/50 sm:text-sm">{user?.email}</p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-black/20 px-3 py-1.5 text-[11px] text-white/60"><span className={`size-1.5 rounded-full ${user?.emailVerified ? "bg-[#86c29d]" : "bg-[#e5b27f]"}`} />{user?.emailVerified ? "Verified account" : "Email verification pending"}</span>
      </section>
      <section className="mt-6 overflow-hidden rounded-[20px] border border-white/[.08] bg-[#171517]/90 sm:mt-7">
        <div className="flex min-h-[62px] items-center justify-between gap-4 border-b border-white/[.07] px-4 py-4 sm:px-5">
          <span className="text-[13px] text-white/50">Account type</span><span className="rounded-full border border-white/[.08] bg-white/[.035] px-3 py-1 text-[11px] font-medium text-white/80">{user?.role === "USER" ? "Member" : user?.role}</span>
        </div>
        <div className="flex min-h-[62px] items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <span className="text-[13px] text-white/50">Email status</span><span className={`inline-flex items-center gap-2 text-[12px] ${user?.emailVerified ? "text-[#a9d6b7]" : "text-[#e5b27f]"}`}><span className="size-1.5 rounded-full bg-current" />{user?.emailVerified ? "Verified" : "Pending verification"}</span>
        </div>
      </section>
      <Link href="/creator" className="group mt-5 flex min-h-[88px] items-center gap-4 rounded-[20px] border border-[#d9a26d]/20 bg-[radial-gradient(ellipse_at_top_right,rgba(167,91,47,.2),transparent_65%),linear-gradient(135deg,#211710,#171416)] px-4 py-4 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-[#e5b27f]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b27f] sm:mt-6 sm:min-h-[96px] sm:px-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px] border border-[#e5b27f]/20 bg-[#e5b27f]/[.08] text-[#e8b582] sm:size-12">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3 14.5 9.5 21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /><path d="m19 2 .8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8L19 2Z" /></svg>
        </span>
        <span className="min-w-0 flex-1 text-left"><span className="block text-[14px] font-semibold text-white">Creator&apos;s Lab</span><span className="mt-1 block text-[11px] leading-4 text-white/55 sm:text-xs">Create stories and bring them to life</span></span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-white/45 transition-transform group-hover:translate-x-1 group-hover:text-[#e5b27f]" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
      </Link>
      <button type="button" onClick={() => void logout()} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-white/[.08] bg-white/[.025] text-[13px] font-medium text-white/60 transition-colors hover:border-white/[.15] hover:bg-white/[.05] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></svg>Log out</button>
      <p className="mt-6 text-center text-[10px] tracking-wide text-white/25">Your account, your stories, your next watch.</p>
    </div>
  </main>;
}

export default function ProfilePage() {
  return <AuthGate><ProfileContent /></AuthGate>;
}
