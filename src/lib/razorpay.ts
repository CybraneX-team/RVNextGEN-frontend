// Standard Checkout chooses UPI Intent on supported mobile devices and UPI QR on desktop.
const LIVE_UPI_CONFIG = {
  display: { hide: [{ method: "upi", flows: ["collect"] }] },
} as const;

export function razorpayUpiOptions(keyId: string) {
  // Razorpay's test checkout uses a simulated UPI ID; hiding Collect there removes UPI entirely.
  // In live mode, hide deprecated Collect and let Razorpay offer Intent or QR.
  return keyId.startsWith("rzp_test_") ? {} : { config: LIVE_UPI_CONFIG };
}
