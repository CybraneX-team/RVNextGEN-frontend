export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : currency === 'AED' ? 'en-AE' : 'en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(minor / 100);
}
