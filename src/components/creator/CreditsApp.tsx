"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import { getCreditBalance } from "@/lib/creator";
import {
  confirmStripe, creditPacks, creditPurchases, creditRegion, startCreditPurchase,
  type CreditPack, type CreditRegion, type CreditTxn,
} from "@/lib/credits";
import { formatMoney } from "@/lib/money";

/** Describe where the region (and therefore gateway) came from. */
function regionNote(region: CreditRegion): string {
  const where = region.source === "unknown" ? "not yet determined" : region.source === "test" ? "development test region" : region.source === "ip" ? "network location" : "network edge";
  return `Region: ${region.detectedCountryCode ?? "unknown"} · ${region.currency} via ${region.provider} (${where})`;
}

export default function CreditsApp() {
  const { accessToken, user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [region, setRegion] = useState<CreditRegion | null>(null);
  const [packs, setPacks] = useState<CreditPack[] | null>(null);
  const [history, setHistory] = useState<CreditTxn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [stripePack, setStripePack] = useState<CreditPack | null>(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripePaying, setStripePaying] = useState(false);

  const reloadBalance = useCallback(async () => {
    if (!accessToken) return;
    try { const b = await getCreditBalance(accessToken); setBalance(b.balance); } catch { /* keep prior */ }
  }, [accessToken]);

  const reloadHistory = useCallback(async () => {
    if (!accessToken) return;
    try { const h = await creditPurchases(accessToken); setHistory(h.items); } catch { /* keep prior */ }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    creditRegion(accessToken).then((r) => { if (live) setRegion(r); }).catch(() => {});
    creditPacks(accessToken).then((p) => { if (live) setPacks(p); }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load credit packs"); });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch then set; not a synchronous cascade
    void reloadBalance(); void reloadHistory();
    return () => { live = false; };
  }, [accessToken, reloadBalance, reloadHistory]);

  /** Poll until the webhook grants the purchased credits. */
  const pollBalance = useCallback(async (before: number | null) => {
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try { const b = await getCreditBalance(accessToken!); if (before == null || b.balance > before) { setBalance(b.balance); void reloadHistory(); return true; } } catch { /* retry */ }
    }
    void reloadBalance(); void reloadHistory();
    return false;
  }, [accessToken, reloadBalance, reloadHistory]);

  async function buy(pack: CreditPack) {
    if (!accessToken || !user || !region) return;
    setError(null); setNotice(null);
    if (region.provider === "stripe") { setStripePack(pack); return; }
    setBusyPack(pack.id);
    try {
      const before = balance;
      await startCreditPurchase(pack, "razorpay", accessToken, { email: user.email });
      setNotice("Payment received — adding your credits…");
      const ok = await pollBalance(before);
      setNotice(ok ? "Credits added to your balance." : "Payment is processing; your credits will appear shortly.");
    } catch (e) { if ((e as Error).message !== "Payment cancelled") setError(e instanceof Error ? e.message : "Payment failed"); }
    finally { setBusyPack(null); }
  }

  // Mount the Stripe Payment Element once the modal container is on screen.
  useEffect(() => {
    if (!stripePack || !accessToken || !user) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset modal state when a Stripe purchase begins
    setStripeReady(false); setError(null);
    startCreditPurchase(stripePack, "stripe", accessToken, { email: user.email })
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
      setNotice("Payment received — adding your credits…");
      const ok = await pollBalance(before);
      setNotice(ok ? "Credits added to your balance." : "Payment is processing; your credits will appear shortly.");
    } catch (e) { setError(e instanceof Error ? e.message : "Payment failed"); }
    finally { setStripePaying(false); }
  }

  return (
    <div className="min-h-dvh bg-[#0e0d0f] text-white">
      <header className="flex items-center gap-4 border-b border-white/8 px-5 py-4">
        <Link href="/creator" className="text-[13px] text-white/60 hover:text-white">← Creator Lab</Link>
        <h1 className="text-[17px] font-semibold">Buy credits</h1>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
        <section className="mb-7 rounded-2xl border border-[#e5b27f]/25 bg-[radial-gradient(ellipse_at_top_right,rgba(229,178,127,.16),transparent_60%),#141615] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#e7bd94]/70">Creator Lab credits</p>
          <p className="mt-2 text-[40px] font-semibold tracking-[-1px]">{balance == null ? "…" : `${(balance / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</p>
          <p className="mt-1 text-[12px] text-white/40">Credits power AI generation (story, images, video). You&apos;re charged by real usage.</p>
          {region && <p className="mt-2 text-[12px] text-white/50">{regionNote(region)}</p>}
        </section>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-300/15 bg-red-300/[.06] px-4 py-3 text-[13px] text-[#ff9b9b]">{error}</p>}
        {notice && <p className="mb-4 rounded-xl border border-[#e5b27f]/25 bg-[#e5b27f]/[.08] px-4 py-3 text-[13px] text-[#e7bd94]">{notice}</p>}

        <section className="mb-9">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Credit packs</h2>
            {region && <span className="rounded-md border border-white/12 px-2.5 py-1 text-[12px] capitalize text-white/60">Pay via {region.provider}</span>}
          </div>
          {packs == null ? <p className="text-[13px] text-white/40">Loading packs…</p> : packs.length === 0 ? <p className="text-[13px] text-white/40">No credit packs available for your region yet.</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {packs.map((p) => (
                <div key={p.id} className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <span className="text-[13px] font-medium text-white/80">{p.name}</span>
                  <span className="mt-1 text-[22px] font-semibold">{p.creditCount.toLocaleString()} <span className="text-[13px] font-normal text-white/55">credits</span></span>
                  <span className="mt-1 text-[13px] text-white/55">Pay {formatMoney(p.pricePaise, p.currency)}</span>
                  <button onClick={() => void buy(p)} disabled={busyPack === p.id || !region} className="mt-3 h-9 rounded-md bg-[#e5b27f] text-[13px] font-semibold text-[#211a12] hover:bg-[#d9a46d] disabled:opacity-50">{busyPack === p.id ? "Opening…" : "Buy"}</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Purchases</h2>
          {history.length === 0 ? <p className="text-[13px] text-white/40">No credit purchases yet.</p> : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/8">
              {history.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div><p className="text-[13px] text-white/80">{t.pack?.name ?? "Credit pack"}{t.pack ? ` · ${t.pack.creditCount.toLocaleString()} credits` : ""}</p><p className="text-[11px] text-white/40">{new Date(t.createdAt).toLocaleString()} · {t.provider.toLowerCase()}</p></div>
                  <div className="text-right"><p className="text-[14px] font-semibold text-white/80">{formatMoney(t.amountPaise, t.currency)}</p><p className={`text-[11px] ${t.status === "SUCCEEDED" ? "text-[#9fe0bd]" : t.status === "FAILED" ? "text-[#ff8f8f]" : "text-white/40"}`}>{t.status.toLowerCase()}</p></div>
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
            <div id="credits-stripe-payment-element" className="min-h-[120px]" />
            {!stripeReady && <p className="text-[13px] text-white/40">Loading secure payment form…</p>}
            <button onClick={() => void payStripe()} disabled={!stripeReady || stripePaying} className="mt-4 h-10 w-full rounded-md bg-[#e5b27f] text-[14px] font-semibold text-[#211a12] hover:bg-[#d9a46d] disabled:opacity-50">{stripePaying ? "Processing…" : `Pay ${formatMoney(stripePack.pricePaise, stripePack.currency)}`}</button>
          </div>
        </div>
      )}
    </div>
  );
}
