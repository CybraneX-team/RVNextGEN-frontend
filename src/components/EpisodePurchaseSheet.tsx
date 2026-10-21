"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, LockKeyhole, X, ArrowRight, ShieldCheck, LoaderCircle } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { LiquidGlassButton } from "./LiquidGlassSurface";
import { createPlayback, type Playback } from "@/lib/content";
import { ApiError } from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import { unlockEpisode, unlockPreview, walletRegion, type UnlockPreview, type WalletRegion } from "@/lib/wallet";
import { beginCheckout, bundlesForSeries, mountEpisodeStripe, purchaseStatus, showEpisodeRazorpay, type EpisodeBundle, type PendingCheckout } from "@/lib/episode-payments";

const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount / 100);
const primary = "flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#161412] outline-offset-4 hover:bg-[#f3e5d5] disabled:cursor-wait disabled:opacity-50";

/** One purchase task, staying above the original episode so cancelling never loses your place. */
export default function EpisodePurchaseSheet({ episodeId, seriesId, title, onReady, onClose }: { episodeId: string; seriesId?: string | null; title: string; onReady: (playback: Playback) => void; onClose: () => void }) {
  const { accessToken: token, user } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const stripeMount = useRef<HTMLDivElement>(null);
  const stripe = useRef<Awaited<ReturnType<typeof mountEpisodeStripe>> | null>(null);
  const live = useRef(true);
  const locked = useRef(false);
  const callbacks = useRef({ onReady, onClose });
  useEffect(() => { callbacks.current = { onReady, onClose }; }, [onReady, onClose]);
  const [preview, setPreview] = useState<UnlockPreview | null>(null);
  const [region, setRegion] = useState<WalletRegion | null>(null);
  const [bundles, setBundles] = useState<EpisodeBundle[]>([]);
  const [choice, setChoice] = useState("episode");
  const [phase, setPhase] = useState<"loading" | "choose" | "checkout" | "stripe" | "confirming" | "pending" | "error">("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savedCheckout, setSavedCheckout] = useState<PendingCheckout | null>(null);
  const pending = useRef<PendingCheckout | null>(null);
  const storageKey = `rv-episode-checkout:${user?.id}:${episodeId}`;
  const busy = ["loading", "checkout", "confirming"].includes(phase);

  const remember = useCallback((value: PendingCheckout | null) => {
    pending.current = value;
    setSavedCheckout(value);
    try { if (value) localStorage.setItem(storageKey, JSON.stringify(value)); else localStorage.removeItem(storageKey); } catch { /* In-memory retries still reuse the same order. */ }
  }, [storageKey]);

  const play = useCallback(async () => {
    if (!token) throw new Error("Sign in to watch this episode.");
    const playback = await createPlayback(episodeId, token, getDeviceId());
    if (!live.current) return;
    remember(null);
    callbacks.current.onReady(playback);
  }, [episodeId, token, remember]);

  const refresh = useCallback(async () => {
    if (!token) { setError("Sign in to unlock this episode."); setPhase("error"); return; }
    setPhase("loading"); setError("");
    try {
      const price = await unlockPreview(episodeId, token);
      if (!live.current) return;
      if (price.alreadyUnlocked) { await play(); return; }
      const [paymentRegion, available] = await Promise.all([walletRegion(token), seriesId ? bundlesForSeries(seriesId, token) : Promise.resolve([])]);
      if (!live.current) return;
      setPreview(price); setRegion(paymentRegion);
      setBundles(available.filter(bundle => bundle.items.some(item => item.episodeId === episodeId) && (paymentRegion.provider !== "razorpay" || bundle.currency === "INR")));
      setPhase(pending.current ? "pending" : "choose");
    } catch (e) { if (live.current) { setError(e instanceof Error ? e.message : "Could not load the price. Please retry."); setPhase("error"); } }
  }, [episodeId, token, seriesId, play]);

  useEffect(() => {
    live.current = true;
    const modal = dialog.current!;
    const focus = document.activeElement as HTMLElement | null;
    modal.showModal();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as PendingCheckout | null;
      if (saved?.key && ["episode", "package"].includes(saved.kind)) {
        pending.current = saved;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore this user’s saved checkout after hydration
        setSavedCheckout(saved); setChoice(saved.kind === "episode" ? "episode" : saved.targetId);
      }
    } catch { /* A malformed saved checkout can be ignored. */ }
    void refresh();
    return () => { live.current = false; stripe.current?.destroy(); stripe.current = null; modal.close(); focus?.focus({ preventScroll: true }); };
  }, [refresh, storageKey]);

  async function checkPayment() {
    if (locked.current || !token) return;
    locked.current = true; setPhase("confirming"); setError("");
    try {
      for (let attempt = 0; attempt < 15 && live.current; attempt++) {
        const current = pending.current;
        if (!current?.purchaseId) break;
        const result = await purchaseStatus(current, token);
        if (!live.current) return;
        if (result.status === "SUCCEEDED") { await play(); return; }
        if (["FAILED", "CANCELLED", "REFUNDED"].includes(result.status)) throw new Error("This payment has not completed. Contact support if money was deducted; do not pay again while it is being checked.");
        await new Promise(resolve => window.setTimeout(resolve, 2000));
      }
      if (live.current) { setPhase("pending"); setNotice("Payment is still being confirmed. You can close this window and return to this episode later. Please don’t pay again if money was deducted."); }
    } catch (e) { if (live.current) { setError(e instanceof Error ? e.message : "Could not check payment. Please retry."); setPhase("pending"); } }
    finally { locked.current = false; }
  }

  async function purchase() {
    if (locked.current || !token || !user || !preview || !region) return;
    locked.current = true; setError(""); setNotice(""); setPhase("checkout");
    try {
      if (!pending.current) {
        // Refresh expired quotes, but require another click if the amount changed.
        const fresh = await unlockPreview(episodeId, token);
        if (fresh.alreadyUnlocked) { await play(); return; }
        setPreview(fresh);
        if (choice === "episode" && (fresh.priceMinor !== preview.priceMinor || fresh.currency !== preview.currency)) { setNotice("The episode price changed. Review the updated price before continuing."); setPhase("choose"); return; }
        if (choice === "episode" && fresh.sufficient && fresh.quoteId) {
          await unlockEpisode(episodeId, fresh.quoteId, token); await play(); return;
        }
        remember({ key: crypto.randomUUID(), kind: choice === "episode" ? "episode" : "package", targetId: choice === "episode" ? episodeId : choice, quoteId: choice === "episode" ? fresh.quoteId! : undefined, provider: region.provider });
      }
      const current = pending.current!;
      const checkout = await beginCheckout(current, token);
      if (checkout.status === "FAILED" && !checkout.providerOrderId) {
        remember(null);
        throw new Error("Checkout could not be created. No payment was taken through this checkout. Please try again.");
      }
      if (checkout.entitled || checkout.status === "SUCCEEDED") { await play(); return; }
      const shownAmount = current.amountPaise ?? (current.kind === "episode" ? preview.priceMinor : bundles.find(bundle => bundle.id === current.targetId)?.pricePaise);
      const shownCurrency = current.currency ?? (current.kind === "episode" ? preview.currency : bundles.find(bundle => bundle.id === current.targetId)?.currency);
      remember({ ...current, purchaseId: checkout.episodePaymentId ?? checkout.packagePurchaseId, amountPaise: checkout.amountPaise, currency: checkout.currency });
      if (checkout.amountPaise !== shownAmount || checkout.currency !== shownCurrency) {
        setNotice("Review your saved checkout total below before continuing."); setPhase("pending"); return;
      }
      if (!live.current) return;
      if (current.provider === "stripe") {
        stripe.current?.destroy();
        stripe.current = await mountEpisodeStripe(checkout, stripeMount.current!);
        if (!live.current) { stripe.current.destroy(); return; }
        setPhase("stripe"); return;
      }
      // Razorpay owns focus while its checkout is open. A native modal would cover its iframe.
      dialog.current?.close(); dialog.current?.show();
      try { await showEpisodeRazorpay(checkout, user.email, title); }
      finally { if (live.current) { dialog.current?.close(); dialog.current?.showModal(); } }
      locked.current = false;
      if (live.current) await checkPayment();
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && !pending.current?.purchaseId) remember(null);
      if (live.current) { setError(e instanceof Error ? e.message : "Could not open checkout. Please retry."); setPhase(pending.current ? "pending" : "choose"); } }
    finally { locked.current = false; }
  }

  async function payStripe() {
    if (locked.current || !stripe.current) return;
    locked.current = true; setError(""); setPhase("checkout");
    try { await stripe.current.confirm(); locked.current = false; await checkPayment(); }
    catch (e) { if (live.current) { setError(e instanceof Error ? e.message : "Payment failed. Please retry."); setPhase("stripe"); } }
    finally { locked.current = false; }
  }

  const selected = bundles.find(bundle => bundle.id === choice);
  const label = choice === "episode" && preview ? `${preview.sufficient ? "Unlock with wallet" : "Pay"} · ${money(preview.priceMinor, preview.currency)}` : selected ? `Pay · ${money(selected.pricePaise, selected.currency)}` : "Continue";
  return <dialog ref={dialog} aria-labelledby="episode-purchase-title" onCancel={event => { event.preventDefault(); callbacks.current.onClose(); }} className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[28px] border border-white/15 bg-[#191715] p-0 text-[#faf7f2] shadow-2xl backdrop:bg-black/70 sm:inset-0 sm:m-auto sm:max-h-[90dvh] sm:w-[480px] sm:rounded-[28px]">
    <div className="p-6 pb-[max(24px,env(safe-area-inset-bottom))] sm:p-8">
      <div className="mb-6 flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-medium tracking-widest text-[#d7b38c]"><LockKeyhole size={15} /> RVNEXT GEN · PREMIUM</span><LiquidGlassButton aria-label="Close purchase" onClick={() => callbacks.current.onClose()} className="grid size-11 place-items-center rounded-full"><X size={19} /></LiquidGlassButton></div>
      <h2 id="episode-purchase-title" className="text-2xl font-semibold tracking-tight">Your next story awaits.</h2>
      <p className="mt-2 text-base leading-relaxed text-[#c8c2bc]">{title}</p>
      <div className="mt-6 space-y-3">
        {busy && <p role="status" className="flex items-center gap-3 py-6 text-sm"><LoaderCircle className="animate-spin motion-reduce:animate-none" size={20} />{phase === "loading" ? "Checking your access…" : phase === "confirming" ? "Confirming your payment securely…" : "Preparing secure checkout…"}</p>}
        {preview && phase === "choose" && <fieldset disabled={Boolean(savedCheckout)} className="space-y-3"><legend className="sr-only">Choose episode access</legend>
          <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${choice === "episode" ? "border-[#d7b38c] bg-[#302820]" : "border-white/15 bg-white/[.03]"}`}><input type="radio" name="episode-access" value="episode" checked={choice === "episode"} onChange={() => setChoice("episode")} className="size-4 accent-[#d7b38c]" /><span className="flex-1"><span className="block text-sm font-semibold">This episode</span><span className="mt-1 block text-xs text-[#c8c2bc]">Watch again for 1 year · One-time purchase</span></span><strong className="text-lg">{money(preview.priceMinor, preview.currency)}</strong></label>
          {bundles.map(bundle => <label key={bundle.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${choice === bundle.id ? "border-[#d7b38c] bg-[#302820]" : "border-white/15 bg-white/[.03]"}`}><input type="radio" name="episode-access" value={bundle.id} checked={choice === bundle.id} onChange={() => setChoice(bundle.id)} className="size-4 accent-[#d7b38c]" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{bundle.name}</span><span className="mt-1 block text-xs text-[#c8c2bc]">{bundle.items.length} included episodes · Includes this episode</span></span><strong className="text-lg">{money(bundle.pricePaise, bundle.currency)}</strong></label>)}
        </fieldset>}
        {preview && phase === "choose" && preview.sufficient && choice === "episode" && <p className="flex items-center gap-2 text-xs text-[#c8c2bc]"><Check size={15} /> Wallet balance: {money(preview.balanceMinor, preview.currency)}</p>}
        <div ref={stripeMount} hidden={phase !== "stripe" && phase !== "checkout"} />
        {error && <p role="alert" className="rounded-xl bg-[#472824] p-3 text-sm leading-relaxed text-[#ffd9d1]">{error}</p>}
        {notice && <p role="status" className="text-sm leading-relaxed text-[#c8c2bc]">{notice}</p>}
        {phase === "choose" && <button onClick={() => void purchase()} className={primary}>{label}<ArrowRight size={16} /></button>}
        {phase === "stripe" && <button onClick={() => void payStripe()} className={primary}>Pay{savedCheckout?.amountPaise != null && savedCheckout.currency ? ` · ${money(savedCheckout.amountPaise, savedCheckout.currency)}` : " securely"}<ArrowRight size={16} /></button>}
        {phase === "pending" && <><p className="text-sm leading-relaxed text-[#c8c2bc]">Your checkout is saved{savedCheckout?.amountPaise != null && savedCheckout.currency ? ` · ${money(savedCheckout.amountPaise, savedCheckout.currency)}` : ""}. Check a payment you’ve made, or continue the same checkout.</p>{savedCheckout?.purchaseId && <button onClick={() => void checkPayment()} className={primary}>Check payment status</button>}<button onClick={() => void purchase()} className="min-h-12 w-full rounded-full border border-white/25 px-5 text-sm">Continue saved checkout</button></>}
        {phase === "error" && (token ? <button onClick={() => void refresh()} className={primary}>Try again</button> : <a href="/login" className={primary}>Sign in to continue</a>)}
      </div>
      <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs leading-relaxed text-[#c8c2bc]"><ShieldCheck size={15} className="shrink-0" />Secure checkout · No subscription or recurring charge</p>
    </div>
  </dialog>;
}
