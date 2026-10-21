import { apiFetch } from "./client";
import { loadGatewayScript, type Gateway } from "./wallet";

export type EpisodeBundle = { id: string; name: string; pricePaise: number; currency: string; items: { episodeId: string; isFree: boolean }[] };
export type PurchaseKind = "episode" | "package";
export type Checkout = { entitled?: boolean; episodePaymentId?: string; packagePurchaseId?: string; provider: Gateway; providerOrderId: string; keyId?: string; clientSecret?: string; publishableKey?: string; amountPaise: number; currency: string; status?: string };
export type PendingCheckout = { key: string; kind: PurchaseKind; targetId: string; quoteId?: string; provider: Gateway; purchaseId?: string; amountPaise?: number; currency?: string };
export const bundlesForSeries = (id: string, token: string) => apiFetch<EpisodeBundle[]>(`payments/series/${id}/packages`, { token });
export const purchaseStatus = (pending: PendingCheckout, token: string) => apiFetch<{ status: string }>(`payments/purchases/${pending.kind}/${pending.purchaseId}`, { token });
export const beginCheckout = (pending: PendingCheckout, token: string) => apiFetch<Checkout>(pending.kind === "episode" ? `payments/episodes/${pending.targetId}/checkout` : "payments/packages/checkout", {
  method: "POST", token, headers: { "idempotency-key": pending.key },
  body: pending.kind === "episode" ? { quoteId: pending.quoteId, provider: pending.provider } : { packageId: pending.targetId, provider: pending.provider },
});

export async function showEpisodeRazorpay(checkout: Checkout, email: string, title: string) {
  await loadGatewayScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!window.Razorpay || !checkout.keyId || !checkout.providerOrderId) throw new Error("Payment checkout is unavailable. Please try again.");
  return new Promise<void>((resolve, reject) => {
    const gateway = new window.Razorpay!({ key: checkout.keyId, order_id: checkout.providerOrderId, amount: checkout.amountPaise, currency: checkout.currency,
      name: "RVNext Gen", description: title, prefill: { email }, theme: { color: "#24211e" },
      handler: () => resolve(), modal: { ondismiss: () => reject(new Error("Checkout closed. Your episode is saved here; you can continue whenever you’re ready.")) },
    });
    gateway.open();
  });
}

export async function mountEpisodeStripe(checkout: Checkout, container: HTMLElement) {
  await loadGatewayScript("https://js.stripe.com/v3/");
  if (!window.Stripe || !checkout.publishableKey || !checkout.clientSecret) throw new Error("Payment checkout is unavailable. Please try again.");
  const stripe = window.Stripe(checkout.publishableKey);
  const elements = stripe.elements({ clientSecret: checkout.clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#e8bd8d", colorBackground: "#24211e", borderRadius: "12px" } } });
  const payment = elements.create("payment");
  payment.mount(container);
  return {
    destroy: () => payment.destroy?.(),
    confirm: async () => {
      const { error } = await stripe.confirmPayment({ elements, redirect: "if_required", confirmParams: { return_url: (() => { const url = new URL(window.location.href); url.searchParams.set("resumePurchase", "1"); return url.toString(); })() } });
      if (error) throw new Error(error.message ?? "Payment could not be completed. Please try again.");
    },
  };
}
