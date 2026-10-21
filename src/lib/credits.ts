import { apiFetch } from "./client";

// ---- Types ----
/** A Creator Lab credit pack, priced in the viewer's regional currency. `creditCount` is universal. */
export type CreditPack = { id: string; name: string; creditCount: number; pricePaise: number; currency: string };
export type Gateway = "razorpay" | "stripe";
export type CreditRegion = { detectedCountryCode: string | null; countryCode: string; currency: string; provider: Gateway; source: "edge" | "ip" | "test" | "unknown" };
export type CreditTxn = { id: string; creditPackId: string | null; provider: string; amountPaise: number; currency: string; status: string; createdAt: string; pack: { name: string; creditCount: number } | null };
export type CreditHistory = { items: CreditTxn[]; page: number; limit: number; totalPages: number; total: number };

type RazorpayCheckout = { providerOrderId: string; keyId: string; reused?: boolean };
type StripeCheckout = { providerOrderId: string; clientSecret: string; publishableKey: string; reused?: boolean };
type CheckoutResponse = (RazorpayCheckout | StripeCheckout) & { creditPackPurchaseId: string; provider: Gateway };

// ---- API ----
export const creditPacks = (token: string) => apiFetch<CreditPack[]>("payments/credit-packs", { token });
export const creditRegion = (token: string) => apiFetch<CreditRegion>("payments/region", { token });
export const creditPurchases = (token: string, page = 1) => apiFetch<CreditHistory>(`payments/me/credit-pack-purchases?page=${page}&limit=20`, { token });
const creditCheckout = (creditPackId: string, provider: Gateway, idempotencyKey: string, token: string) =>
  apiFetch<CheckoutResponse>("payments/credit-packs/checkout", { method: "POST", body: { creditPackId, provider }, token, headers: { "idempotency-key": idempotencyKey } });

// ---- Gateway helpers (self-contained; mirrors lib/wallet.ts so the wallet flow stays untouched) ----
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

/**
 * Start a credit-pack purchase. Opens the region's gateway UI. Credits are granted server-side by
 * the payment webhook, so the caller should poll the balance afterwards. Resolves when the user
 * completes/submits payment, rejects if they cancel or it errors.
 */
export async function startCreditPurchase(pack: CreditPack, provider: Gateway, token: string, user: { email: string }): Promise<void> {
  const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const res = await creditCheckout(pack.id, provider, idempotencyKey, token);
  if (provider === "razorpay") return openRazorpay(res as RazorpayCheckout & CheckoutResponse, pack, user);
  return openStripe(res as StripeCheckout & CheckoutResponse);
}

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; Stripe?: (key: string) => StripeInstance }
}
export type StripeElement = { mount: (sel: string | HTMLElement) => void; destroy?: () => void };
export type StripeElements = { create: (type: string) => StripeElement; submit?: () => Promise<{ error?: { message?: string } }> };
export type StripeInstance = {
  elements: (opts: { clientSecret: string; appearance?: Record<string, unknown> }) => StripeElements;
  confirmPayment: (opts: { elements: StripeElements; redirect: "if_required"; confirmParams?: { return_url: string } }) => Promise<{ error?: { message?: string } }>;
};

async function openRazorpay(res: RazorpayCheckout, pack: CreditPack, user: { email: string }): Promise<void> {
  await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!window.Razorpay) throw new Error("Could not load Razorpay.");
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: res.keyId,
      order_id: res.providerOrderId,
      amount: pack.pricePaise,
      currency: pack.currency,
      name: "Creator Lab Credits",
      description: `${pack.creditCount.toLocaleString()} credits`,
      prefill: { email: user.email },
      theme: { color: "#e5b27f" },
      handler: () => resolve(),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
}

// Stripe uses a Payment Element mounted into a modal the caller renders (#credits-stripe-payment-element).
async function openStripe(res: StripeCheckout): Promise<void> {
  await loadScript("https://js.stripe.com/v3/");
  if (!window.Stripe) throw new Error("Could not load Stripe.");
  const stripe = window.Stripe(res.publishableKey);
  const elements = stripe.elements({ clientSecret: res.clientSecret, appearance: { theme: "night" } as Record<string, unknown> });
  const container = document.getElementById("credits-stripe-payment-element");
  if (!container) throw new Error("Stripe container not ready");
  elements.create("payment").mount(container);
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
