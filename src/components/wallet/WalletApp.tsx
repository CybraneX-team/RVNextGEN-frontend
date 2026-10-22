"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, Coins, Globe, LockOpen, Plus, Receipt, ShieldCheck, SlidersHorizontal, Sparkles, Undo2, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import {
  confirmStripe, reconcileWallet, reconcileWalletPurchase, startTopUp, walletBalance, walletHistory, walletPacks, walletRegion,
  type CoinTxn, type Gateway, type WalletPack, type WalletRegion,
} from "@/lib/wallet";
import { formatMoney, formatCredits } from "@/lib/money";

const TXN_LABEL: Record<CoinTxn["type"], string> = { TOPUP: "Top-up", UNLOCK: "Episode unlock", REFUND: "Refund", ADJUSTMENT: "Adjustment" };
const TXN_ICON: Record<CoinTxn["type"], LucideIcon> = { TOPUP: Plus, UNLOCK: LockOpen, REFUND: Undo2, ADJUSTMENT: SlidersHorizontal };

/** Split "1,250 credits" into a large number and a small unit. */
function splitCredits(minor: number) {
  const [amount, ...unit] = formatCredits(minor).split(" ");
  return { amount, unit: unit.join(" ") };
}

export default function WalletApp() {
  const { accessToken, user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [region, setRegion] = useState<WalletRegion | null>(null);
  const [packs, setPacks] = useState<WalletPack[] | null>(null);
  const [history, setHistory] = useState<CoinTxn[]>([]);
  const [provider, setProvider] = useState<Gateway>("razorpay");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [stripePack, setStripePack] = useState<WalletPack | null>(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripePaying, setStripePaying] = useState(false);

  const reload = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [b, h] = await Promise.all([walletBalance(accessToken), walletHistory(accessToken)]);
      setBalance(b.balanceMinor); setHistory(h.items);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load your wallet"); }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    walletPacks(accessToken).then((p) => { if (live) setPacks(p); }).catch(() => {});
    walletRegion(accessToken).then((r) => { if (live) { setRegion(r); setProvider(r.provider); } }).catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload fetches then sets state; not a synchronous cascade
    void reload();
    // Recover captured top-ups whose webhook or browser callback was missed.
    reconcileWallet(accessToken).then((result) => {
      if (!live) return;
      if (result.recovered) { setNotice("Your completed top-ups have been added to your wallet."); void reload(); }
      if (result.unavailable) setError("Some pending payments could not be checked. Reopen your wallet to retry; do not pay again.");
    }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not check pending payments"); });
    return () => { live = false; };
  }, [accessToken, reload]);

  /** Poll until the payment webhook credits the local-currency balance. */
  const pollBalance = useCallback(async (before: number | null) => {
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try { const b = await walletBalance(accessToken!); if (before == null || b.balanceMinor > before) { setBalance(b.balanceMinor); void reload(); return true; } } catch { /* retry */ }
    }
    void reload();
    return false;
  }, [accessToken, reload]);

  async function buy(pack: WalletPack) {
    if (!accessToken || !user) return;
    setError(null); setNotice(null);
    if (provider === "stripe") { setStripePack(pack); return; }
    setBusyPack(pack.id);
    try {
      let payment = await startTopUp(pack, "razorpay", accessToken, { email: user.email });
      if (!payment) throw new Error("Payment confirmation was not returned");
      setNotice("Checking payment confirmation…");
      for (let attempt = 0; payment.status === "PENDING" && attempt < 8; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        payment = await reconcileWalletPurchase(payment.id, accessToken);
      }
      const ok = payment.status === "SUCCEEDED";
      await reload();
      setNotice(ok ? "Funds added to your wallet." : "Payment is processing; your balance will update shortly.");
    } catch (e) { if ((e as Error).message !== "Payment cancelled") setError(e instanceof Error ? e.message : "Payment failed"); }
    finally { setBusyPack(null); }
  }

  // Mount the Stripe Payment Element once the modal (and its container) is on screen.
  useEffect(() => {
    if (!stripePack || !accessToken || !user) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset modal state when a Stripe top-up begins
    setStripeReady(false); setError(null);
    startTopUp(stripePack, "stripe", accessToken, { email: user.email })
      .then(() => { if (live) setStripeReady(true); })
      .catch((e) => { if (live) { setError(e instanceof Error ? e.message : "Could not start Stripe"); setStripePack(null); } });
    return () => { live = false; };
  }, [stripePack, accessToken, user]);

  async function payStripe() {
    setStripePaying(true); setError(null);
    try {
      const before = balance;
      await confirmStripe();
      setStripePack(null);
      setNotice("Payment received — updating your wallet…");
      const ok = await pollBalance(before);
      setNotice(ok ? "Funds added to your wallet." : "Payment is processing; your balance will update shortly.");
    } catch (e) { setError(e instanceof Error ? e.message : "Payment failed"); }
    finally { setStripePaying(false); }
  }

  const balanceParts = balance == null ? null : splitCredits(balance);
  const ratios = (packs ?? []).map((p) => p.creditAmountMinor / p.pricePaise);
  const baseRatio = ratios.length ? Math.min(...ratios) : 1;
  const bestRatio = ratios.length ? Math.max(...ratios) : 1;
  const regionNote = region && (region.source === "unknown" ? "Showing INR until your country is detected" : region.source === "test" ? "Development test region" : `Detected from ${region.source === "ip" ? "network location" : "network edge"}`);

  return (
    <div className="min-h-dvh bg-[#100e0c] text-white">
      <header className="sticky top-0 z-20 border-b border-white/[.07] bg-[#100e0c]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="Back" className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[.04] text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><ArrowLeft className="size-[18px]" /></Link>
          <h1 className="text-[17px] font-semibold tracking-[-.02em]">Wallet</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <section aria-label="Balance" className="relative isolate overflow-hidden rounded-[28px] border border-[#e7b580]/20 bg-[linear-gradient(135deg,#4a2e1d_0%,#241812_46%,#15110f_100%)] p-6 shadow-[0_30px_80px_-30px_#000] sm:p-9">
          <div aria-hidden="true" className="absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-[radial-gradient(circle,#ffb347_0%,#f0792f66_38%,transparent_70%)] opacity-60 blur-2xl" />
          <div aria-hidden="true" className="absolute -right-10 -bottom-32 -z-10 size-80 rounded-full border border-white/[.07]" />
          <div className="flex items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.2em] text-[#f4d6b0]/80"><Coins className="size-4" /> Episode credits</p>
            {region && <span className="hidden items-center gap-1.5 rounded-full border border-white/12 bg-black/20 px-3 py-1 text-[11px] text-white/65 sm:inline-flex"><Globe className="size-3.5" />{region.detectedCountryCode ?? "Unknown region"}</span>}
          </div>
          <p className="mt-5 flex items-baseline gap-2.5 font-semibold tracking-[-.045em]" aria-live="polite">
            <span className="text-[56px] leading-none sm:text-[72px]">{balanceParts ? balanceParts.amount : "…"}</span>
            {balanceParts && <span className="text-lg font-medium tracking-normal text-[#f4d6b0]/70 sm:text-xl">{balanceParts.unit}</span>}
          </p>
          <div className="mt-6 flex flex-col gap-2 text-[13px] text-white/60 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <p className="flex items-center gap-2"><Clock3 className="size-4 shrink-0 text-[#e7b580]/80" /> Credits unlock an episode for one year.</p>
            {region && <p className="flex items-center gap-2 text-white/45"><Globe className="size-4 shrink-0 sm:hidden" />{regionNote}</p>}
          </div>
        </section>

        {error && <p role="alert" className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/[.07] px-4 py-3 text-[13px] text-[#ffb0b0]">{error}</p>}
        {notice && <p role="status" className="mt-5 flex items-center gap-2 rounded-2xl border border-[#e7b580]/25 bg-[#e7b580]/[.08] px-4 py-3 text-[13px] text-[#f4d6b0]"><Sparkles className="size-4 shrink-0" />{notice}</p>}

        <section aria-label="Add funds" className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><h2 className="text-[19px] font-semibold tracking-[-.03em]">Add funds</h2><p className="mt-1 text-[13px] text-white/45">Pick a pack. Bigger packs include bonus credits.</p></div>
            {region && <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[12px] capitalize text-white/65"><ShieldCheck className="size-3.5 text-[#e7b580]" />Secure · {region.provider}</span>}
          </div>
          {packs == null ? (
            <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">{[0, 1, 2].map((n) => <div key={n} className="h-[212px] animate-pulse rounded-3xl border border-white/[.06] bg-white/[.03]" />)}</div>
          ) : packs.length === 0 ? <p className="rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-6 text-center text-[13px] text-white/45">No packs available yet.</p> : (
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {packs.map((p) => {
                const ratio = p.creditAmountMinor / p.pricePaise;
                const bonus = Math.round((ratio / baseRatio - 1) * 100);
                const best = packs.length > 1 && bestRatio > baseRatio && ratio === bestRatio;
                const { amount, unit } = splitCredits(p.creditAmountMinor);
                return (
                  <div key={p.id} className={`relative flex flex-col rounded-3xl border p-5 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 ${best ? "border-[#e7b580]/50 bg-[linear-gradient(160deg,#35231a,#1a1411)] shadow-[0_20px_50px_-24px_#e7b58099]" : "border-white/10 bg-[#171412] hover:border-white/20"}`}>
                    {best && <span className="absolute -top-2.5 left-5 rounded-full bg-[#e7b580] px-2.5 py-0.5 text-[10px] font-bold tracking-[.12em] text-[#1a130e] uppercase">Best value</span>}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-white/70">{p.name}</span>
                      {bonus > 0 && <span className="rounded-full bg-[#e7b580]/15 px-2 py-0.5 text-[11px] font-semibold text-[#f4d6b0]">+{bonus}% bonus</span>}
                    </div>
                    <p className="mt-4 flex items-baseline gap-1.5"><span className="text-[34px] leading-none font-semibold tracking-[-.04em]">{amount}</span><span className="text-[13px] text-white/50">{unit}</span></p>
                    <p className="mt-2 text-[13px] text-white/50">for {formatMoney(p.pricePaise, p.currency)}</p>
                    <button type="button" onClick={() => void buy(p)} disabled={busyPack === p.id || busyPack !== null} className={`mt-5 h-11 rounded-full text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 ${best ? "bg-[#e7b580] text-[#1a130e] hover:bg-[#f0c595]" : "bg-white text-[#1a130e] hover:bg-white/85"}`}>{busyPack === p.id ? "Opening…" : `Buy for ${formatMoney(p.pricePaise, p.currency)}`}</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section aria-label="History" className="mt-12">
          <h2 className="mb-4 text-[19px] font-semibold tracking-[-.03em]">History</h2>
          {history.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/12 bg-white/[.015] px-6 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-white/[.06] text-white/50"><Receipt className="size-5" /></span>
              <p className="mt-4 text-[15px] font-medium text-white/80">No wallet activity yet</p>
              <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-white/45">Your top-ups and episode unlocks will show up here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[.06] overflow-hidden rounded-3xl border border-white/[.08] bg-[#151210]">
              {history.map((t) => {
                const Icon = TXN_ICON[t.type];
                const credit = t.deltaMinor >= 0;
                return (
                  <li key={t.id} className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${credit ? "bg-[#e7b580]/12 text-[#f4d6b0]" : "bg-white/[.06] text-white/65"}`}><Icon className="size-[18px]" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-white/90">{TXN_LABEL[t.type]}</p>
                      <p className="mt-0.5 truncate text-[12px] text-white/40">{new Date(t.createdAt).toLocaleString()}</p>
                      {t.accessExpiresAt && <p className="mt-0.5 text-[12px] text-[#e7b580]/80">Access until {new Date(t.accessExpiresAt).toLocaleDateString()}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-[15px] font-semibold tabular-nums ${credit ? "text-[#f4d6b0]" : "text-white/80"}`}>{t.deltaMinor > 0 ? "+" : ""}{formatCredits(t.deltaMinor)}</p>
                      <p className="mt-0.5 text-[11px] text-white/35">Balance {formatCredits(t.balanceAfterMinor)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {stripePack && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !stripePaying && setStripePack(null)}>
          <div role="dialog" aria-modal="true" aria-label="Pay securely" className="w-full max-w-md rounded-t-[28px] border border-white/10 bg-[#161311] p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-[28px] sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-[17px] font-semibold tracking-[-.02em]">Pay {formatMoney(stripePack.pricePaise, stripePack.currency)}</h3><button type="button" aria-label="Close" onClick={() => !stripePaying && setStripePack(null)} className="grid size-9 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"><X className="size-[18px]" /></button></div>
            <div id="stripe-payment-element" className="min-h-[120px]" />
            {!stripeReady && <p className="text-[13px] text-white/40">Loading secure payment form…</p>}
            <button type="button" onClick={() => void payStripe()} disabled={!stripeReady || stripePaying} className="mt-5 h-12 w-full rounded-full bg-[#e7b580] text-[14px] font-semibold text-[#1a130e] transition hover:bg-[#f0c595] disabled:opacity-50">{stripePaying ? "Processing…" : `Pay ${formatMoney(stripePack.pricePaise, stripePack.currency)}`}</button>
          </div>
        </div>
      )}
    </div>
  );
}
