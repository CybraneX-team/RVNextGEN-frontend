export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : currency === 'AED' ? 'en-AE' : 'en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(minor / 100);
}

/**
 * Viewer episode credits: 1 credit = ₹1 = 100 minor units. Amounts are stored in minor units
 * (same scale as money), so credits are shown as minor/100 with a plain "credits" label — the
 * viewer-wallet equivalent of the Creator Lab credit display. This is a separate pool from
 * Creator Lab credits (User.creditsBalance); never mix the two.
 */
export function formatCredits(minor: number): string {
  const credits = minor / 100;
  const magnitude = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.abs(credits));
  return `${credits < 0 ? '-' : ''}${magnitude} ${Math.abs(credits) === 1 ? 'credit' : 'credits'}`;
}
