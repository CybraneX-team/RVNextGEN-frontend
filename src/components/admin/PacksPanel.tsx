"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  adminCreditPackPurchases, adminCreditPacks, adminWalletPacks, adminWalletPurchases, createCreditPack, createWalletPack, updateCreditPack, updateWalletPack,
  type CreditPack, type CreditPackPurchase, type WalletPack, type WalletPurchase,
} from "@/lib/admin";
import { formatMoney } from "@/lib/money";
import { Badge, Button, Card, EmptyState, ErrorLine, Field, Loading, Notice, Segmented, StatusBadge, Switch, inputClass, tdClass, thClass, useAsync } from "./ui";

type Currency = "INR" | "USD" | "AED";
type PackKind = "wallet" | "creator";
const CURRENCIES: Currency[] = ["INR", "USD", "AED"];
const CURRENCY_LABEL: Record<Currency, string> = { INR: "₹ INR · India", USD: "$ USD · US", AED: "AED · UAE" };

/** One pack in display units: `amount` is credits (or, for a non-INR wallet pack, its balance in that currency); `price` is in major units. */
type UiPack = { id: string; name: string; currency: Currency; amount: number; price: number; isActive: boolean };

const fromWallet = (p: WalletPack): UiPack => ({ id: p.id, name: p.name, currency: p.currency, amount: p.creditAmountMinor / 100, price: p.pricePaise / 100, isActive: p.isActive });
const fromCreator = (p: CreditPack): UiPack => ({ id: p.id, name: p.name, currency: p.currency, amount: p.creditCount, price: p.pricePaise / 100, isActive: p.isActive });
const toMinor = (major: number) => Math.round(major * 100);

/** What the buyer receives, in words the client uses. A wallet pack in USD/AED credits a money balance in that currency. */
function receives(kind: PackKind, currency: Currency, amount: number): string {
  if (kind === "wallet" && currency !== "INR") return `${formatMoney(toMinor(amount), currency)} wallet balance`;
  return `${amount.toLocaleString()} credits`;
}

function amountField(kind: PackKind, currency: Currency): { label: string; hint: string; step: string } {
  if (kind === "creator") return { label: "Creator Lab credits the buyer gets", hint: "Whole credits, for example 500.", step: "1" };
  if (currency === "INR") return { label: "Episode credits the buyer gets", hint: "1 episode credit = ₹1 of wallet balance.", step: "1" };
  return { label: `Wallet balance the buyer gets (${currency})`, hint: `Paid episodes are priced in ${currency} for these buyers.`, step: "0.01" };
}

function summary(kind: PackKind, currency: Currency, amount: number, price: number): string | null {
  if (!(amount > 0) || !(price > 0)) return null;
  const per = kind === "wallet" && currency !== "INR" ? "" : ` · ${formatMoney(toMinor(price / amount), currency)} per credit`;
  return `Buyer pays ${formatMoney(toMinor(price), currency)} and gets ${receives(kind, currency, amount)}${per}`;
}

const PACK_COPY: Record<PackKind, { title: string; description: string; empty: string }> = {
  wallet: {
    title: "Episode Credits packs",
    description: "Sold on the viewer Wallet page (/wallet). Viewers spend these credits to unlock paid episodes.",
    empty: "No episode credit packs yet. Select New pack to create one.",
  },
  creator: {
    title: "Creator Lab credit packs",
    description: "Sold on the Creator Lab credits page (/creator/credits). Creators spend these credits on AI generation.",
    empty: "No Creator Lab packs yet. Select New pack to create one.",
  },
};

export default function PacksPanel({ token }: { token: string }) {
  return (
    <div className="space-y-6">
      <Notice tone="info">
        INR packs are shown to every buyer. For buyers in the US and UAE the app converts INR prices automatically. To set your own dollar or dirham price, add a USD or AED pack — once one is switched on, it replaces the converted packs in that currency.
      </Notice>
      <PackSection kind="wallet" token={token} />
      <PackSection kind="creator" token={token} />
      <RecentPurchases token={token} />
    </div>
  );
}

function PackSection({ kind, token }: { kind: PackKind; token: string }) {
  const { data, error, loading, reload } = useAsync<UiPack[]>(
    async (tok) => kind === "wallet" ? (await adminWalletPacks(tok)).items.map(fromWallet) : (await adminCreditPacks(tok)).items.map(fromCreator),
    token,
  );
  const [creating, setCreating] = useState(false);
  const copy = PACK_COPY[kind];
  const packs = [...(data ?? [])].sort((a, b) => CURRENCIES.indexOf(a.currency) - CURRENCIES.indexOf(b.currency) || a.price - b.price);

  return (
    <Card title={copy.title} description={copy.description}
      actions={!creating && <Button tone="primary" onClick={() => setCreating(true)}><Plus className="size-4" />New pack</Button>}>
      {creating && <NewPackForm kind={kind} token={token} onDone={() => { setCreating(false); reload(); }} onCancel={() => setCreating(false)} />}
      {loading ? <Loading /> : error ? <ErrorLine text={error} /> : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.03]"><tr><th className={thClass}>Pack name</th><th className={thClass}>Currency</th><th className={thClass}>Buyer gets</th><th className={thClass}>Price</th><th className={thClass}>Per credit</th><th className={thClass}>Shown to buyers</th><th className={thClass}></th></tr></thead>
            <tbody>{packs.map((p) => <PackRow key={p.id} kind={kind} pack={p} token={token} onChanged={reload} />)}</tbody>
          </table>
          {packs.length === 0 && <EmptyState>{copy.empty}</EmptyState>}
        </div>
      )}
    </Card>
  );
}

async function savePack(kind: PackKind, token: string, pack: { id?: string; name: string; currency: Currency; amount: number; price: number; isActive?: boolean }) {
  const pricePaise = toMinor(pack.price);
  if (kind === "wallet") {
    const creditAmountMinor = toMinor(pack.amount);
    return pack.id
      ? updateWalletPack(pack.id, { name: pack.name, creditAmountMinor, pricePaise, isActive: pack.isActive }, token)
      : createWalletPack({ name: pack.name, currency: pack.currency, creditAmountMinor, pricePaise }, token);
  }
  return pack.id
    ? updateCreditPack(pack.id, { name: pack.name, creditCount: pack.amount, pricePaise, isActive: pack.isActive }, token)
    : createCreditPack({ name: pack.name, currency: pack.currency, creditCount: pack.amount, pricePaise }, token);
}

/** Returns an error message, or null when the values can be saved. */
function validate(kind: PackKind, currency: Currency, name: string, amount: number, price: number): string | null {
  if (!name.trim()) return "Give the pack a name.";
  if (!(amount > 0)) return "Enter how many credits the buyer gets.";
  if ((kind === "creator" || currency === "INR") && !Number.isInteger(amount)) return "Credits must be a whole number.";
  if (!(price > 0)) return "Enter the price the buyer pays.";
  return null;
}

function NewPackForm({ kind, token, onDone, onCancel }: { kind: PackKind; token: string; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = amountField(kind, currency);
  const preview = summary(kind, currency, Number(amount), Number(price));

  async function create() {
    const problem = validate(kind, currency, name, Number(amount), Number(price));
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null);
    try { await savePack(kind, token, { name: name.trim(), currency, amount: Number(amount), price: Number(price) }); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not create the pack."); setBusy(false); }
  }

  return (
    <div className="mb-4 rounded-xl border border-[#2f7d5b]/40 bg-[#2f7d5b]/[0.06] p-4">
      <h3 className="mb-3 text-[14px] font-semibold text-white">New pack</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Pack name" hint="Shown to buyers, e.g. “500 credits”."><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus /></Field>
        <Field label="Currency" hint="India pays by Razorpay; US and UAE by Stripe."><select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>{CURRENCIES.map((c) => <option key={c} value={c} className="bg-[#14171a]">{CURRENCY_LABEL[c]}</option>)}</select></Field>
        <Field label={field.label} hint={field.hint}><input className={inputClass} type="number" min="0" step={field.step} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" /></Field>
        <Field label={`Price (${currency})`} hint="What the buyer pays at checkout."><input className={inputClass} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="399" /></Field>
      </div>
      {preview && <p className="mt-3 text-[13px] text-[#a9e8c6]">{preview}</p>}
      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      <div className="mt-4 flex gap-2">
        <Button tone="primary" onClick={() => void create()} disabled={busy}>{busy ? "Creating…" : "Create pack"}</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function PackRow({ kind, pack, token, onChanged }: { kind: PackKind; pack: UiPack; token: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pack.name);
  const [amount, setAmount] = useState(String(pack.amount));
  const [price, setPrice] = useState(String(pack.price));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = amountField(kind, pack.currency);
  const perCredit = kind === "wallet" && pack.currency !== "INR" ? "—" : formatMoney(toMinor(pack.price / pack.amount), pack.currency);

  async function save(next: Partial<UiPack>) {
    const merged = { ...pack, name: name.trim(), amount: Number(amount), price: Number(price), ...next };
    const problem = validate(kind, merged.currency, merged.name, merged.amount, merged.price);
    if (problem) { setError(problem); return; }
    setBusy(true); setError(null);
    try { await savePack(kind, token, merged); setEditing(false); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  }

  if (editing) {
    return (
      <tr className="border-t border-white/5 bg-white/[0.02]">
        <td className={tdClass}><input className={inputClass} aria-label="Pack name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></td>
        <td className={tdClass}>{pack.currency}</td>
        <td className={tdClass}><input className={inputClass} aria-label={field.label} type="number" min="0" step={field.step} value={amount} onChange={(e) => setAmount(e.target.value)} /></td>
        <td className={tdClass}><input className={inputClass} aria-label="Price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></td>
        <td className={tdClass} colSpan={2}>{error ? <span className="text-[12px] text-[#ff8f8f]">{error}</span> : <span className="text-[12px] text-white/40">{summary(kind, pack.currency, Number(amount), Number(price))}</span>}</td>
        <td className={tdClass}><div className="flex gap-1.5"><Button size="sm" tone="primary" disabled={busy} onClick={() => void save({})}>{busy ? "Saving…" : "Save"}</Button><Button size="sm" onClick={() => { setEditing(false); setError(null); setName(pack.name); setAmount(String(pack.amount)); setPrice(String(pack.price)); }}>Cancel</Button></div></td>
      </tr>
    );
  }
  return (
    <tr className={`border-t border-white/5 ${pack.isActive ? "" : "opacity-55"}`}>
      <td className={`${tdClass} font-medium text-white`}>{pack.name}</td>
      <td className={tdClass}><Badge tone={pack.currency === "INR" ? "neutral" : "info"}>{pack.currency}</Badge></td>
      <td className={tdClass}>{receives(kind, pack.currency, pack.amount)}</td>
      <td className={tdClass}>{formatMoney(toMinor(pack.price), pack.currency)}</td>
      <td className={`${tdClass} text-white/55`}>{perCredit}</td>
      <td className={tdClass}>
        <div className="flex items-center gap-2">
          <Switch checked={pack.isActive} disabled={busy} label={`Show ${pack.name} to buyers`} onChange={(v) => void save({ isActive: v })} />
          <span className="text-[12px] text-white/50">{pack.isActive ? "On" : "Off"}</span>
        </div>
        {error && <p className="mt-1 text-[11px] text-[#ff8f8f]">{error}</p>}
      </td>
      <td className={tdClass}><Button size="sm" onClick={() => setEditing(true)}>Edit</Button></td>
    </tr>
  );
}

function RecentPurchases({ token }: { token: string }) {
  const [view, setView] = useState<PackKind>("wallet");
  const wallet = useAsync((tok) => adminWalletPurchases(tok), token);
  const creator = useAsync((tok) => adminCreditPackPurchases(tok), token);
  const source = view === "wallet" ? wallet : creator;
  return (
    <Card title="Recent purchases" description="The latest pack purchases and their payment status. Pending means the payment provider has not confirmed yet."
      actions={<Segmented label="Purchase type" value={view} onChange={setView} options={[{ value: "wallet", label: "Episode credits" }, { value: "creator", label: "Creator Lab" }]} />}>
      {source.loading ? <Loading /> : source.error ? <ErrorLine text={source.error} /> : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.03]"><tr><th className={thClass}>When</th><th className={thClass}>Buyer</th><th className={thClass}>Pack</th><th className={thClass}>Received</th><th className={thClass}>Paid</th><th className={thClass}>Status</th></tr></thead>
            <tbody>
              {view === "wallet"
                ? (wallet.data?.items ?? []).map((p: WalletPurchase) => (
                  <tr key={p.id} className="border-t border-white/5"><td className={tdClass}>{new Date(p.createdAt).toLocaleString()}</td><td className={tdClass}>{p.user?.email ?? "—"}</td><td className={tdClass}>{p.pack?.name ?? "—"}</td><td className={tdClass}>{p.amountCreditedMinor != null ? receives("wallet", p.currency as Currency, p.amountCreditedMinor / 100) : "—"}</td><td className={tdClass}>{formatMoney(p.amountPaise, p.currency)}</td><td className={tdClass}><StatusBadge status={p.status} /></td></tr>
                ))
                : (creator.data?.items ?? []).map((p: CreditPackPurchase) => (
                  <tr key={p.id} className="border-t border-white/5"><td className={tdClass}>{new Date(p.createdAt).toLocaleString()}</td><td className={tdClass}>{p.user?.email ?? "—"}</td><td className={tdClass}>{p.pack?.name ?? "—"}</td><td className={tdClass}>{p.pack ? `${p.pack.creditCount.toLocaleString()} credits` : "—"}</td><td className={tdClass}>{formatMoney(p.amountPaise, p.currency)}</td><td className={tdClass}><StatusBadge status={p.status} /></td></tr>
                ))}
            </tbody>
          </table>
          {(source.data?.items.length ?? 0) === 0 && <EmptyState>No purchases yet.</EmptyState>}
        </div>
      )}
    </Card>
  );
}
