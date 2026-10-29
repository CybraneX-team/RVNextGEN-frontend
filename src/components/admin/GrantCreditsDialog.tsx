"use client";

import { useState } from "react";
import { grantCredits, type AdminUser } from "@/lib/admin";
import { Button, Dialog, Field, Notice, inputClass } from "./ui";

/** Admin-only: give free Creator Lab (generation) credits to one user. */
export default function GrantCreditsDialog({ user, token, onClose, onGranted }: { user: AdminUser; token: string; onClose: () => void; onGranted: (balance: number) => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) { setError("Enter a whole number of credits greater than 0."); return; }
    if (!reason.trim()) { setError("Add a short reason, for example “Welcome bonus”."); return; }
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
    <Dialog title="Give Creator Lab credits" subtitle={`${user.email} · has ${(user.creditsBalance / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} credits`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-[13px] leading-5 text-white/50">Free credits for AI generation in Creator Lab. They show as “Given free” in Credit history. Episode credits are separate.</p>
        <Field label="Credits to give"><input className={inputClass} type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500" autoFocus /></Field>
        <Field label="Reason"><input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. Welcome bonus" onKeyDown={(e) => { if (e.key === "Enter") void submit(); }} /></Field>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2 pt-1">
          <Button tone="primary" onClick={() => void submit()} disabled={busy}>{busy ? "Giving…" : "Give credits"}</Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Dialog>
  );
}
