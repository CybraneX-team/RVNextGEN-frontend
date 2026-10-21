import { apiFetch } from "./client";

// ---- Types ----
export type WalletPack = { id: string; name: string; creditAmountMinor: number; pricePaise: number; currency: string };
export type CoinTxn = { id: string; deltaMinor: number; type: "TOPUP" | "UNLOCK" | "REFUND" | "ADJUSTMENT"; balanceAfterMinor: number; episodeId: string | null; accessExpiresAt: string | null; createdAt: string };
export type WalletHistory = { currency: string; balanceMinor: number; items: CoinTxn[]; page: number; limit: number; totalPages: number };
export type UnlockPreview = { episodeId: string; title: string; priceMinor: number; currency: string; alreadyUnlocked: boolean; balanceMinor: number; sufficient: boolean; expiresAt?: string | null; quoteId: string | null; quoteExpiresAt?: string };
export type UnlockResult = { entitled: boolean; alreadyUnlocked: boolean; chargedMinor: number; currency: string; balanceMinor: number; expiresAt: string | null };
export type Gateway = "razorpay" | "stripe";
export type WalletRegion = { detectedCountryCode: string | null; countryCode: string; currency: string; provider: Gateway; source: "edge" | "ip" | "test" | "unknown" };

type RazorpayCheckout = { providerOrderId: string; keyId: string; reused?: boolean };
type StripeCheckout = { providerOrderId: string; clientSecret: string; publishableKey: string; reused?: boolean };
type CheckoutResponse = (RazorpayCheckout | StripeCheckout) & { walletPurchaseId: string; provider: Gateway; amountCreditedMinor?: number };
export type WalletPaymentStatus = { id: string; status: "PENDING" | "SUCCEEDED" | "FAILED" };
type RazorpayVerification = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

// ---- API ----
export const walletPacks = (token: string) => apiFetch<WalletPack[]>("wallet/packs", { token });
export const walletRegion = (token: string) => apiFetch<WalletRegion>("wallet/region", { token });
export const walletBalance = (token: string) => apiFetch<{ balanceMinor: number; currency: string }>("wallet/me", { token });
export const walletHistory = (token: string, page = 1) => apiFetch<WalletHistory>(`wallet/transactions?page=${page}&limit=20`, { token });
export const reconcileWallet = (token: string) => apiFetch<{ recovered: number; unavailable: number }>("wallet/reconcile", { method: "POST", token });
export const reconcileWalletPurchase = (id: string, token: string) => apiFetch<WalletPaymentStatus>(`wallet/purchases/${id}/reconcile`, { method: "POST", token });
export const unlockPreview = (episodeId: string, token: string) => apiFetch<UnlockPreview>(`wallet/unlock-preview/${episodeId}`, { token });
export const unlockEpisode = (episodeId: string, quoteId: string, token: string) => apiFetch<UnlockResult>(`wallet/unlock/${episodeId}`, { method: "POST", body: { quoteId }, token });
const walletCheckout = (walletPackId: string, provider: Gateway, idempotencyKey: string, token: string) =>
  apiFetch<CheckoutResponse>("wallet/checkout", { method: "POST", body: { walletPackId, provider }, token, headers: { "idempotency-key": idempotencyKey } });

// ---- Gateway helpers ----
const gatewayScripts = new Map<string, Promise<void>>();
export function loadGatewayScript(src: string): Promise<void> {
  const existing = gatewayScripts.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => { script.remove(); gatewayScripts.delete(src); reject(new Error("Payment checkout took too long to load. Please retry.")); }, 20000);
    script.src = src; script.async = true;
    script.onload = () => { window.clearTimeout(timeout); resolve(); };
    script.onerror = () => { window.clearTimeout(timeout); script.remove(); gatewayScripts.delete(src); reject(new Error("Could not load payment checkout. Check your connection and retry.")); };
    document.body.appendChild(script);
  });
  gatewayScripts.set(src, promise);
  return promise;
}

/**
 * Razorpay success is verified by the server before returning a purchase status.
 * Webhooks and reconciliation use the same atomic wallet credit operation.
 */
export async function startTopUp(pack: WalletPack, provider: Gateway, token: string, user: { email: string }): Promise<WalletPaymentStatus | void> {
  const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const res = await walletCheckout(pack.id, provider, idempotencyKey, token);
  if (provider === "razorpay") return openRazorpay(res as RazorpayCheckout & CheckoutResponse, pack, user, token);
  return openStripe(res as StripeCheckout & CheckoutResponse);
}



async function openRazorpay(res: RazorpayCheckout & { walletPurchaseId: string }, pack: WalletPack, user: { email: string }, token: string): Promise<WalletPaymentStatus> {
  await loadGatewayScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!window.Razorpay) throw new Error("Could not load Razorpay.");
  return new Promise<WalletPaymentStatus>((resolve, reject) => {
    let submitted = false;
    const rzp = new window.Razorpay!({
      key: res.keyId,
      order_id: res.providerOrderId,
      amount: pack.pricePaise,
      currency: pack.currency,
      name: "Viewer Wallet",
      description: `Viewer wallet ${pack.currency} top-up`,
      prefill: { email: user.email },
      theme: { color: "#2f7d5b" },
      handler: (verification: RazorpayVerification) => {
        submitted = true;
        apiFetch<WalletPaymentStatus>(`wallet/purchases/${res.walletPurchaseId}/verify`, { method: "POST", body: verification, token }).then(resolve).catch(() => {
          // A network failure after payment must lead to a provider check, never another charge.
          reconcileWalletPurchase(res.walletPurchaseId, token).then(resolve).catch(() => reject(new Error("Payment was submitted, but verification is unavailable. Reopen your wallet to check it; do not pay again.")));
        });
      },
      modal: { ondismiss: () => { if (!submitted) reject(new Error("Payment cancelled")); } },
    });
    rzp.open();
  });
}

// Stripe uses a Payment Element mounted into a modal the caller renders (#stripe-payment-element).
async function openStripe(res: StripeCheckout): Promise<void> {
  await loadGatewayScript("https://js.stripe.com/v3/");
  if (!window.Stripe) throw new Error("Could not load Stripe.");
  const stripe = window.Stripe(res.publishableKey);
  const elements = stripe.elements({ clientSecret: res.clientSecret, appearance: { theme: "night" } as Record<string, unknown> });
  const container = document.getElementById("stripe-payment-element");
  if (!container) throw new Error("Stripe container not ready");
  elements.create("payment").mount(container);
  // The caller shows a "Pay" button that calls confirmStripe(); here we expose the confirm closure.
  stripePendingConfirm = async () => {
    const { error } = await stripe.confirmPayment({ elements, redirect: "if_required", confirmParams: { return_url: window.location.href } });
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
