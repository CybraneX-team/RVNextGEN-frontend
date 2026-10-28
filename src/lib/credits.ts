import { apiFetch } from "./client";
import { razorpayUpiOptions } from "./razorpay";
import { loadGatewayScript } from "./wallet";

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
export type CreditPaymentStatus = { id: string; status: "PENDING" | "SUCCEEDED" | "FAILED" };
type RazorpayVerification = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

// ---- API ----
export const creditPacks = (token: string) => apiFetch<CreditPack[]>("payments/credit-packs", { token });
export const creditRegion = (token: string) => apiFetch<CreditRegion>("payments/region", { token });
export const creditPurchases = (token: string, page = 1) => apiFetch<CreditHistory>(`payments/me/credit-pack-purchases?page=${page}&limit=20`, { token });
export const reconcileCreditPurchases = (token: string) => apiFetch<{ recovered: number; unavailable: number }>("payments/credit-pack-purchases/reconcile", { method: "POST", token });
export const reconcileCreditPurchase = (id: string, token: string) => apiFetch<CreditPaymentStatus>(`payments/credit-pack-purchases/${id}/reconcile`, { method: "POST", token });
const creditCheckout = (creditPackId: string, provider: Gateway, idempotencyKey: string, token: string) =>
  apiFetch<CheckoutResponse>("payments/credit-packs/checkout", { method: "POST", body: { creditPackId, provider }, token, headers: { "idempotency-key": idempotencyKey } });

/**
 * Razorpay success is verified server-side; reconciliation and webhooks grant credits atomically.
 */
export async function startCreditPurchase(pack: CreditPack, provider: Gateway, token: string, user: { email: string }): Promise<CreditPaymentStatus | void> {
  const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const res = await creditCheckout(pack.id, provider, idempotencyKey, token);
  if (provider === "razorpay") return openRazorpay(res as RazorpayCheckout & CheckoutResponse, pack, user, token);
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

async function openRazorpay(res: RazorpayCheckout & { creditPackPurchaseId: string }, pack: CreditPack, user: { email: string }, token: string): Promise<CreditPaymentStatus> {
  await loadGatewayScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!window.Razorpay) throw new Error("Could not load Razorpay.");
  return new Promise<CreditPaymentStatus>((resolve, reject) => {
    let submitted = false;
    const rzp = new window.Razorpay!({
      key: res.keyId,
      order_id: res.providerOrderId,
      amount: pack.pricePaise,
      currency: pack.currency,
      name: "Creator Lab Credits",
      description: `${pack.creditCount.toLocaleString()} credits`,
      prefill: { email: user.email },
      theme: { color: "#e5b27f" },
      ...razorpayUpiOptions(res.keyId),
      handler: (verification: RazorpayVerification) => {
        submitted = true;
        apiFetch<CreditPaymentStatus>(`payments/credit-pack-purchases/${res.creditPackPurchaseId}/verify`, { method: "POST", body: verification, token }).then(resolve).catch(() => {
          reconcileCreditPurchase(res.creditPackPurchaseId, token).then(resolve).catch(() => reject(new Error("Payment was submitted, but verification is unavailable. Reopen Buy credits to check it; do not pay again.")));
        });
      },
      modal: { ondismiss: () => { if (!submitted) reject(new Error("Payment cancelled")); } },
    });
    rzp.open();
  });
}

// Stripe uses a Payment Element mounted into a modal the caller renders (#credits-stripe-payment-element).
async function openStripe(res: StripeCheckout): Promise<void> {
  await loadGatewayScript("https://js.stripe.com/v3/");
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
