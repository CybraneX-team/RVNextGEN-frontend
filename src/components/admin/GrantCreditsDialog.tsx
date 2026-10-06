"use client";

import { useEffect, useState } from "react";
import { grantCredits, type AdminUser } from "@/lib/admin";

const input = "h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-white/30";
const label = "mb-1 block text-[12px] font-medium text-white/55";

/** Admin-only: add generation credits to a user's balance (no payment flow yet). */
export default function GrantCreditsDialog({ user, token, onClose, onGranted }: { user: AdminUser; token: string; onClose: () => void; onGranted: (balance: number) => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (busy) return;
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) { setError("Enter a whole number of credits greater than 0."); return; }
    if (!reason.trim()) { setError("A reason is required (it's recorded in the audit log)."); return; }
    setBusy(true); setError(null);
    try {
      const result = await grantCredits(user.id, n, reason.trim(), token);
      onGranted(result.creditsBalance);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not grant credits.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Grant credits" onClick={onClose}>
      <div className="mt-16 w-full max-w-md rounded-xl border border-white/10 bg-[#101314] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-white">Grant credits</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-white/5 text-white/70 hover:bg-white/10">✕</button>
        </div>
        <p className="mb-4 text-[13px] text-white/50">{user.email} · currently {user.creditsBalance} credits</p>
        {error && <p role="alert" className="mb-3 text-[13px] text-[#ff8f8f]">{error}</p>}
        <div className="flex flex-col gap-3">
          <div>
            <span className={label}>Credits to add</span>
            <input className={input} type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500" autoFocus />
          </div>
          <div>
            <span className={label}>Reason</span>
            <input className={input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. Testing Creator Lab" onKeyDown={(e) => { if (e.key === "Enter") void submit(); }} />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={submit} disabled={busy} className="h-11 rounded-lg bg-[#2f7d5b] px-5 text-[14px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50">{busy ? "Granting…" : "Grant credits"}</button>
            <button type="button" onClick={onClose} className="h-11 rounded-lg border border-white/12 px-4 text-[14px] text-white/70 hover:bg-white/5">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
