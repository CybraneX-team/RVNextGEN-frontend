"use client";

import { useState } from "react";
import { adjustWallet, type AdminUser } from "@/lib/admin";
import { formatMoney } from "@/lib/money";
import { Button, Dialog, Field, Notice, Segmented, inputClass } from "./ui";

type Currency = "INR" | "USD" | "AED";

/** Episode-credit balance in words: INR is shown as credits (1 credit = ₹1), other currencies as money. */
export function walletLabel(minor: number, currency: string): string {
  return currency === "INR" ? `${(minor / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} credits` : formatMoney(minor, currency);
}

/** Admin-only: add or remove Viewer Wallet (episode) credit for one user, e.g. a goodwill credit or a correction. */
export default function WalletAdjustDialog({ user, token, onClose, onDone }: { user: AdminUser; token: string; onClose: () => void; onDone: () => void }) {
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const current = user.walletBalances?.find((b) => b.currency === currency)?.balanceMinor ?? 0;
  const isCredits = currency === "INR";

  async function submit() {
    if (busy) return;
    const value = Number(amount);
    if (!(value > 0)) { setError(isCredits ? "Enter how many credits to add or remove." : "Enter an amount greater than 0."); return; }
    if (isCredits && !Number.isInteger(value)) { setError("Credits must be a whole number."); return; }
    if (!reason.trim()) { setError("Add a short reason, for example “Refund for a playback problem”."); return; }
    const minor = Math.round(value * 100) * (direction === "add" ? 1 : -1);
    if (minor < 0 && -minor > current) { setError(`This user only has ${walletLabel(current, currency)}.`); return; }
    setBusy(true); setError(null);
    try {
      const res = await adjustWallet(user.id, minor, currency, reason.trim(), token);
      setResult(`Done. New balance: ${walletLabel(res.balanceMinor, currency)}.`);
      onDone();
    } catch (e) {
      setError(e instanceof Error && e.message === "Balance too low" ? "The user does not have enough credit to remove that much." : e instanceof Error ? e.message : "Could not update the balance.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Episode credits" subtitle={user.email} onClose={onClose}>
      {result ? (
        <div className="space-y-4">
          <Notice tone="success">{result}</Notice>
          <Button tone="primary" onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] leading-5 text-white/50">Episode credits unlock paid episodes. They are separate from Creator Lab credits.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented label="Add or remove" value={direction} onChange={setDirection} options={[{ value: "add", label: "Add credits" }, { value: "remove", label: "Remove credits" }]} />
            <Segmented label="Currency" value={currency} onChange={(c) => setCurrency(c)} options={[{ value: "INR", label: "India ₹" }, { value: "USD", label: "US $" }, { value: "AED", label: "UAE AED" }]} />
          </div>
          <p className="text-[13px] text-white/70">Current balance: <span className="font-semibold text-white">{walletLabel(current, currency)}</span></p>
          <Field label={isCredits ? "Credits" : `Amount (${currency})`} hint={isCredits ? "1 credit = ₹1." : `Added to the user's ${currency} wallet balance.`}>
            <input className={inputClass} type="number" min="0" step={isCredits ? "1" : "0.01"} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={isCredits ? "50" : "1.00"} autoFocus />
          </Field>
          <Field label="Reason" hint="Recorded with the change.">
            <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. Goodwill credit" onKeyDown={(e) => { if (e.key === "Enter") void submit(); }} />
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex gap-2 pt-1">
            <Button tone={direction === "add" ? "primary" : "danger"} onClick={() => void submit()} disabled={busy}>{busy ? "Saving…" : direction === "add" ? "Add credits" : "Remove credits"}</Button>
            <Button onClick={onClose}>Cancel</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
