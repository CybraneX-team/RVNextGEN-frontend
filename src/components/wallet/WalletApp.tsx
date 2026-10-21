"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import {
  confirmStripe, reconcileWallet, reconcileWalletPurchase, startTopUp, walletBalance, walletHistory, walletPacks, walletRegion,
  type CoinTxn, type Gateway, type WalletPack, type WalletRegion,
} from "@/lib/wallet";
import { formatMoney, formatCredits } from "@/lib/money";

const TXN_LABEL: Record<CoinTxn["type"], string> = { TOPUP: "Top-up", UNLOCK: "Episode unlock", REFUND: "Refund", ADJUSTMENT: "Adjustment" };

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

  return (
    <div className="min-h-dvh bg-[#0e0d0f] text-white">
      <header className="flex items-center gap-4 border-b border-white/8 px-5 py-4">
        <Link href="/" className="text-[13px] text-white/60 hover:text-white">← Back</Link>
        <h1 className="text-[17px] font-semibold">Wallet</h1>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        <section className="mb-7 rounded-2xl border border-[#2f7d5b]/25 bg-[radial-gradient(ellipse_at_top_right,rgba(47,125,91,.18),transparent_60%),#141615] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#9fe0bd]/70">Episode credits</p>
          <p className="mt-2 text-[40px] font-semibold tracking-[-1px]">{balance == null ? "…" : formatCredits(balance)}</p>
          <p className="mt-1 text-[12px] text-white/40">Use credits to unlock episodes for one year.</p>
          {region && <p className="mt-2 text-[12px] text-white/50">Region: {region.detectedCountryCode ?? 'unknown'} · {region.source === 'unknown' ? 'Showing INR until your country can be determined' : region.source === 'test' ? 'Development test region' : `Detected from ${region.source === 'ip' ? 'network location' : 'network edge'}`}</p>}
        </section>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-300/15 bg-red-300/[.06] px-4 py-3 text-[13px] text-[#ff9b9b]">{error}</p>}
        {notice && <p className="mb-4 rounded-xl border border-[#2f7d5b]/25 bg-[#2f7d5b]/[.08] px-4 py-3 text-[13px] text-[#9fe0bd]">{notice}</p>}

        <section className="mb-9">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Add funds</h2>
            {region && <span className="rounded-md border border-white/12 px-2.5 py-1 text-[12px] capitalize text-white/60">Pay via {region.provider}</span>}
          </div>
          {packs == null ? <p className="text-[13px] text-white/40">Loading packs…</p> : packs.length === 0 ? <p className="text-[13px] text-white/40">No packs available yet.</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {packs.map((p) => (
                <div key={p.id} className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <span className="text-[13px] font-medium text-white/80">{p.name}</span>
                  <span className="mt-1 text-[22px] font-semibold">{formatCredits(p.creditAmountMinor)}</span>
                  <span className="mt-1 text-[13px] text-white/55">Pay {formatMoney(p.pricePaise, p.currency)}</span>
                  <button onClick={() => void buy(p)} disabled={busyPack === p.id} className="mt-3 h-9 rounded-md bg-[#2f7d5b] text-[13px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50">{busyPack === p.id ? "Opening…" : "Buy"}</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[15px] font-semibold">History</h2>
          {history.length === 0 ? <p className="text-[13px] text-white/40">No wallet activity yet.</p> : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/8">
              {history.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div><p className="text-[13px] text-white/80">{TXN_LABEL[t.type]}</p><p className="text-[11px] text-white/40">{new Date(t.createdAt).toLocaleString()}</p>{t.accessExpiresAt && <p className="text-[11px] text-[#9fe0bd]">Access until {new Date(t.accessExpiresAt).toLocaleString()}</p>}</div>
                  <div className="text-right"><p className={`text-[14px] font-semibold ${t.deltaMinor < 0 ? "text-[#ff8f8f]" : "text-[#9fe0bd]"}`}>{t.deltaMinor > 0 ? "+" : ""}{formatCredits(t.deltaMinor)}</p><p className="text-[11px] text-white/40">bal {formatCredits(t.balanceAfterMinor)}</p></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {stripePack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !stripePaying && setStripePack(null)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121314] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-semibold">Pay {formatMoney(stripePack.pricePaise, stripePack.currency)}</h3><button onClick={() => !stripePaying && setStripePack(null)} className="text-white/60 hover:text-white">✕</button></div>
            <div id="stripe-payment-element" className="min-h-[120px]" />
            {!stripeReady && <p className="text-[13px] text-white/40">Loading secure payment form…</p>}
            <button onClick={() => void payStripe()} disabled={!stripeReady || stripePaying} className="mt-4 h-10 w-full rounded-md bg-[#2f7d5b] text-[14px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50">{stripePaying ? "Processing…" : `Pay ${formatMoney(stripePack.pricePaise, stripePack.currency)}`}</button>
          </div>
        </div>
      )}
    </div>
  );
}
