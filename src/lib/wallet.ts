import { apiFetch } from "./client";

// ---- Types ----
export type WalletPack = { id: string; name: string; coinAmount: number; bonusCoins: number; pricePaise: number; currency: string };
export type CoinTxn = { id: string; delta: number; type: "TOPUP" | "UNLOCK" | "REFUND" | "ADJUSTMENT"; balanceAfter: number; episodeId: string | null; createdAt: string };
export type WalletHistory = { balance: number; items: CoinTxn[]; page: number; limit: number; total: number; totalPages: number };
export type UnlockPreview = { episodeId: string; title: string; priceCoins: number; free: boolean; alreadyUnlocked: boolean; balance: number; sufficient: boolean };
export type UnlockResult = { entitled: boolean; alreadyUnlocked: boolean; charged: number; priceCoins: number; balance: number };
export type Gateway = "razorpay" | "stripe";

type RazorpayCheckout = { providerOrderId: string; keyId: string; reused?: boolean };
type StripeCheckout = { providerOrderId: string; clientSecret: string; publishableKey: string; reused?: boolean };
type CheckoutResponse = (RazorpayCheckout | StripeCheckout) & { walletPurchaseId: string; provider: Gateway; coinsCredited?: number };

// ---- API ----
export const walletPacks = (token: string) => apiFetch<WalletPack[]>("wallet/packs", { token });
export const walletBalance = (token: string) => apiFetch<{ coinBalance: number }>("wallet/me", { token });
export const walletHistory = (token: string, page = 1) => apiFetch<WalletHistory>(`wallet/transactions?page=${page}&limit=20`, { token });
export const unlockPreview = (episodeId: string, token: string) => apiFetch<UnlockPreview>(`wallet/unlock-preview/${episodeId}`, { token });
export const unlockEpisode = (episodeId: string, token: string) => apiFetch<UnlockResult>(`wallet/unlock/${episodeId}`, { method: "POST", token });
const walletCheckout = (walletPackId: string, provider: Gateway, idempotencyKey: string, token: string) =>
  apiFetch<CheckoutResponse>("wallet/checkout", { method: "POST", body: { walletPackId, provider }, token, headers: { "idempotency-key": idempotencyKey } });

// ---- Gateway helpers ----
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

/**
 * Start a top-up for a pack. Opens the chosen gateway's payment UI. Coins are credited
 * server-side by the payment webhook, so the caller should poll the balance afterwards.
 * Resolves when the user completes/submits payment, rejects if they cancel or it errors.
 */
export async function startTopUp(pack: WalletPack, provider: Gateway, token: string, user: { email: string }): Promise<void> {
  const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const res = await walletCheckout(pack.id, provider, idempotencyKey, token);
  if (provider === "razorpay") return openRazorpay(res as RazorpayCheckout & CheckoutResponse, pack, user);
  return openStripe(res as StripeCheckout & CheckoutResponse);
}

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; Stripe?: (key: string) => StripeInstance }
}
type StripeInstance = {
  elements: (opts: { clientSecret: string; appearance?: Record<string, unknown> }) => StripeElements;
  confirmPayment: (opts: { elements: StripeElements; redirect: "if_required" }) => Promise<{ error?: { message?: string } }>;
};
type StripeElements = { create: (type: string) => { mount: (sel: string | HTMLElement) => void }; submit?: () => Promise<{ error?: { message?: string } }> };

async function openRazorpay(res: RazorpayCheckout, pack: WalletPack, user: { email: string }): Promise<void> {
  await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!window.Razorpay) throw new Error("Could not load Razorpay.");
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: res.keyId,
      order_id: res.providerOrderId,
      amount: pack.pricePaise,
      currency: pack.currency,
      name: "Viewer Wallet",
      description: `${pack.coinAmount + pack.bonusCoins} coins`,
      prefill: { email: user.email },
      theme: { color: "#2f7d5b" },
      handler: () => resolve(),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
}

// Stripe uses a Payment Element mounted into a modal the caller renders (#stripe-payment-element).
async function openStripe(res: StripeCheckout): Promise<void> {
  await loadScript("https://js.stripe.com/v3/");
  if (!window.Stripe) throw new Error("Could not load Stripe.");
  const stripe = window.Stripe(res.publishableKey);
  const elements = stripe.elements({ clientSecret: res.clientSecret, appearance: { theme: "night" } as Record<string, unknown> });
  const container = document.getElementById("stripe-payment-element");
  if (!container) throw new Error("Stripe container not ready");
  elements.create("payment").mount(container);
  // The caller shows a "Pay" button that calls confirmStripe(); here we expose the confirm closure.
  stripePendingConfirm = async () => {
    const { error } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) throw new Error(error.message ?? "Payment failed");
  };
}

let stripePendingConfirm: (() => Promise<void>) | null = null;
export async function confirmStripe(): Promise<void> {
  if (!stripePendingConfirm) throw new Error("No pending Stripe payment");
  await stripePendingConfirm();
  stripePendingConfirm = null;
}
export const hasPendingStripe = () => stripePendingConfirm !== null;
