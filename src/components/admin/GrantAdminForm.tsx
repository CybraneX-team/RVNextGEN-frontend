"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "../AuthProvider";
import { grantAdmin } from "@/lib/admin";

const input = "h-12 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-white/30";

/** Bootstrap admin access: a signed-in user enters the shared admin password to promote an email. */
export default function GrantAdminForm() {
  const { user, accessToken } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || busy) return;
    setBusy(true); setNotice(null);
    try {
      const result = await grantAdmin(email.trim(), password, accessToken);
      const self = result.user.email.toLowerCase() === user?.email?.toLowerCase();
      if (self) {
        setNotice({ tone: "ok", text: "You're an admin now — reloading…" });
        setTimeout(() => window.location.reload(), 800);
        return;
      }
      setNotice({ tone: "ok", text: result.promoted ? `${result.user.email} is now an admin.` : `${result.user.email} was already an admin.` });
      setBusy(false);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not grant admin access." });
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-[26px] font-semibold tracking-[-0.5px] text-white">Admin access</h1>
      <p className="mt-2 text-[14px] text-white/55">Enter the email to promote and the admin password. Promote your own email to open the dashboard.</p>
      <form onSubmit={submit} className="mt-7 flex flex-col gap-3">
        <div>
          <span className="mb-1 block text-[12px] font-medium text-white/55">Email to make admin</span>
          <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" />
        </div>
        <div>
          <span className="mb-1 block text-[12px] font-medium text-white/55">Admin password</span>
          <input className={input} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="off" />
        </div>
        <button type="submit" disabled={busy} className="mt-2 h-12 rounded-lg bg-white text-[14px] font-semibold text-[#0e0d0f] hover:bg-white/90 disabled:opacity-60">{busy ? "Working…" : "Grant admin access"}</button>
      </form>
      {notice && <p role={notice.tone === "error" ? "alert" : "status"} className={`mt-4 text-[13px] ${notice.tone === "error" ? "text-[#ff8f8f]" : "text-[#8fe3b4]"}`}>{notice.text}</p>}
    </main>
  );
}
