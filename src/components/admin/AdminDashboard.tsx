"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import {
  adminCreditRates, adminCreditTransactions, adminSettings, adminUploads, adminUsers, adminWalletPacks, adminWalletPurchases, createCreditRate, createWalletPack, updateCreditRate, updateSetting, updateWalletPack, userCreatorEconomics,
  type AdminUpload, type AdminUser, type CreditRate, type CreditTransaction, type CreditTxnKind, type UserEconomics, type WalletPack, type WalletPurchase,
} from "@/lib/admin";
import { deleteContent } from "@/lib/admin";
import AddVideo from "./AddVideo";
import CloudflareUpload from "./CloudflareUpload";
import EditContentModal from "./EditContentModal";
import GenresPanel from "./GenresPanel";
import GrantCreditsDialog from "./GrantCreditsDialog";
import AnalyticsPanel from "./AnalyticsPanel";
import { formatMoney } from "@/lib/money";

const TABS = ["Analytics", "Users", "Content", "Genres", "Cost", "Transactions", "Wallet", "Settings", "Add YouTube", "Add Cloudflare"] as const;
type Tab = (typeof TABS)[number];

/** Loads `fn` once per token/dependency change; returns {data, error, loading, reload}. */
function useAsync<T>(fn: (token: string) => Promise<T>, token: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!token) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: reset state before the request
    setLoading(true); setError(null);
    fn(token).then((result) => { if (live) setData(result); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tick, ...deps]);
  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}

const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/40";
const td = "px-3 py-2 text-[13px] text-white/80";
const Loading = () => <p className="text-[13px] text-white/40">Loading…</p>;
const ErrorLine = ({ text }: { text: string }) => <p role="alert" className="text-[13px] text-[#ff8f8f]">{text}</p>;

function UsersPanel({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useAsync((tok) => adminUsers(tok, q || undefined), token, [q]);
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);
  const [econUser, setEconUser] = useState<AdminUser | null>(null);
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or name…" className="mb-3 h-10 w-full max-w-sm rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-white/30" />
      {loading ? <Loading /> : error ? <ErrorLine text={error} /> : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.03]"><tr><th className={th}>Email</th><th className={th}>Name</th><th className={th}>Role</th><th className={th}>Credits</th><th className={th}>Verified</th><th className={th}></th></tr></thead>
            <tbody>{data?.items.map((u: AdminUser) => (
              <tr key={u.id} className="border-t border-white/5"><td className={td}>{u.email}</td><td className={td}>{u.profile?.displayName ?? "—"}</td><td className={td}>{u.role}</td><td className={td}>{u.creditsBalance}</td><td className={td}>{u.emailVerifiedAt ? "Yes" : "No"}</td><td className={td}><div className="flex gap-1.5"><button onClick={() => setEconUser(u)} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10">Economics</button><button onClick={() => setGrantUser(u)} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10">＋ Credits</button></div></td></tr>
            ))}</tbody>
          </table>
          {data && data.items.length === 0 && <p className="p-4 text-[13px] text-white/40">No users found.</p>}
        </div>
      )}
      {grantUser && <GrantCreditsDialog user={grantUser} token={token} onClose={() => setGrantUser(null)} onGranted={reload} />}
      {econUser && <EconomicsDialog user={econUser} token={token} onClose={() => setEconUser(null)} />}
    </div>
  );
}

const rupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

/** Read-only per-user Creator Lab economics modal (credits, API cost, revenue, P/L + per-model breakdown). */
function EconomicsDialog({ user, token, onClose }: { user: AdminUser; token: string; onClose: () => void }) {
  const [data, setData] = useState<UserEconomics | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    userCreatorEconomics(user.id, token).then((d) => { if (live) setData(d); }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Failed to load"); });
    return () => { live = false; };
  }, [user.id, token]);
  const s = data?.summary;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#121314] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div><h3 className="text-[16px] font-semibold text-white">Creator Lab economics</h3><p className="text-[13px] text-white/45">{user.email}</p></div>
          <button onClick={onClose} className="rounded-md border border-white/15 px-3 py-1 text-[13px] text-white/70 hover:bg-white/10">Close</button>
        </div>
        {error ? <ErrorLine text={error} /> : !s ? <Loading /> : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <EconStat label="Credits balance" value={String(s.creditsBalance)} />
              <EconStat label="Credits bought" value={String(s.creditsBought)} />
              <EconStat label="Credits granted" value={String(s.creditsGranted)} />
              <EconStat label="Credits consumed" value={String(s.creditsConsumed)} />
              <EconStat label="Credits refunded" value={String(s.creditsRefunded)} />
              <EconStat label="Revenue (paid)" value={rupees(s.revenuePaise)} />
              <EconStat label="API expenditure" value={rupees(s.apiExpenditurePaise)} />
              <EconStat label="Profit / loss" value={rupees(s.profitLossPaise)} tone={s.profitLossPaise < 0 ? "bad" : "good"} />
              <EconStat label="Consumed credit value" value={rupees(s.creditValuePaise)} />
            </div>
            <h4 className="mb-2 mt-5 text-[13px] font-semibold text-white/70">By model</h4>
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full border-collapse">
                <thead className="bg-white/[0.03]"><tr><th className={th}>Model</th><th className={th}>Op</th><th className={th}>Gens</th><th className={th}>Credits</th><th className={th}>API cost</th><th className={th}>Margin</th></tr></thead>
                <tbody>{data.byModel.map((m, i) => (
                  <tr key={i} className="border-t border-white/5"><td className={td}>{m.provider}/{m.model}</td><td className={td}>{m.operation}</td><td className={td}>{m.generations}</td><td className={td}>{m.creditsConsumed}</td><td className={td}>{rupees(m.apiCostPaise)}</td><td className={`${td} ${m.marginPaise < 0 ? "text-[#ff8f8f]" : "text-[#9fe0bd]"}`}>{rupees(m.marginPaise)}</td></tr>
                ))}</tbody>
              </table>
              {data.byModel.length === 0 && <p className="p-4 text-[13px] text-white/40">No generations yet.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EconStat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
      <div className="text-[11px] text-white/45">{label}</div>
      <div className={`mt-0.5 text-[15px] font-semibold ${tone === "bad" ? "text-[#ff8f8f]" : tone === "good" ? "text-[#9fe0bd]" : "text-white"}`}>{value}</div>
    </div>
  );
}

/** Two-click delete for a title: first click arms, second confirms. */
function DeleteTitleButton({ id, title, token, onDeleted }: { id: string; title: string; token: string; onDeleted: () => void }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try { await deleteContent(id, token); onDeleted(); }
    catch { setBusy(false); setArmed(false); }
  }
  if (!armed) return <button onClick={() => setArmed(true)} title={`Delete “${title}”`} className="rounded-md border border-[#8f2f2f]/50 px-3 py-1 text-[12px] text-[#ff9f9f] hover:bg-[#8f2f2f]/20">Delete</button>;
  return (
    <span className="inline-flex gap-1.5">
      <button onClick={remove} disabled={busy} className="rounded-md bg-[#8f2f2f] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#7a2929] disabled:opacity-50">{busy ? "…" : "Confirm"}</button>
      <button onClick={() => setArmed(false)} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/70 hover:bg-white/10">Cancel</button>
    </span>
  );
}

function ContentPanel({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useAsync((tok) => adminUploads(tok, q || undefined), token, [q]);
  const [editId, setEditId] = useState<string | null>(null);
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles…" className="mb-3 h-10 w-full max-w-sm rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-white/30" />
      {loading ? <Loading /> : error ? <ErrorLine text={error} /> : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.03]"><tr><th className={th}>Title</th><th className={th}>Type</th><th className={th}>Source</th><th className={th}>Visibility</th><th className={th}>Ready</th><th className={th}>Creator</th><th className={th}></th></tr></thead>
            <tbody>{data?.items.map((c: AdminUpload) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className={td}>
                  <div className="flex items-center gap-3">
                    {c.posterUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={c.posterUrl} alt="" className="h-9 w-16 shrink-0 rounded object-cover" referrerPolicy="no-referrer" />
                      : <div className="grid h-9 w-16 shrink-0 place-items-center rounded bg-white/5 text-[10px] text-white/30">—</div>}
                    <span className="truncate">{c.title}</span>
                  </div>
                </td>
                <td className={td}><span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/60">{c.type}</span></td>
                <td className={td}><span className={`rounded-full px-2 py-0.5 text-[11px] ${c.videoSource === "YOUTUBE" ? "bg-[#d33]/15 text-[#ff9a9a]" : "bg-[#f6821f]/15 text-[#f6a95f]"}`}>{c.videoSource}</span></td>
                <td className={td}><span className={c.visibility === "PUBLISHED" ? "text-[#8fe3b4]" : "text-white/55"}>{c.visibility}</span></td>
                <td className={td}>{c.videoSource === "YOUTUBE" ? "—" : c.streamReady == null ? "—" : c.streamReady ? "Yes" : "No"}</td>
                <td className={td}>{c.creator?.email ?? "—"}</td>
                <td className={td}><div className="flex gap-1.5"><button onClick={() => setEditId(c.id)} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10">Edit</button><DeleteTitleButton id={c.id} title={c.title} token={token} onDeleted={reload} /></div></td>
              </tr>
            ))}</tbody>
          </table>
          {data && data.items.length === 0 && <p className="p-4 text-[13px] text-white/40">No titles yet.</p>}
        </div>
      )}
      {editId && <EditContentModal id={editId} token={token} onClose={() => setEditId(null)} onSaved={reload} />}
    </div>
  );
}

const smallInput = "h-9 w-full rounded-md border border-white/12 bg-white/[0.04] px-2 text-[13px] text-white outline-none focus:border-white/30";

/** One editable credit-rate row: shows values, or credits/INR/active inputs while editing. */
function RateRow({ rate, token, onChanged }: { rate: CreditRate; token: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [creditCost, setCreditCost] = useState(String(rate.creditCost));
  const [inr, setInr] = useState((rate.inrCostPaise / 100).toFixed(2));
  const [active, setActive] = useState(rate.isActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const credits = Number(creditCost);
    const inrPaise = Math.round(Number(inr) * 100);
    if (!Number.isInteger(credits) || credits <= 0) { setError("Credits must be a whole number > 0"); return; }
    if (!Number.isInteger(inrPaise) || inrPaise <= 0) { setError("INR cost must be greater than 0"); return; }
    setBusy(true); setError(null);
    try {
      await updateCreditRate(rate.id, { creditCost: credits, inrCostPaise: inrPaise, isActive: active }, token);
      setEditing(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <tr className="border-t border-white/5">
        <td className={td}>{rate.provider}</td><td className={td}>{rate.operation}</td><td className={td}>{rate.model}</td>
        <td className={td}>₹{(rate.inrCostPaise / 100).toFixed(2)}</td><td className={td}>{rate.creditCost}</td>
        <td className={td}>{rate.revenuePaise !== undefined ? `₹${(rate.revenuePaise / 100).toFixed(2)}` : "—"}</td>
        <td className={`${td} ${rate.marginPaise !== undefined && rate.marginPaise < 0 ? "text-[#ff8f8f]" : rate.marginPaise !== undefined ? "text-[#9fe0bd]" : ""}`}>{rate.marginPaise !== undefined ? `₹${(rate.marginPaise / 100).toFixed(2)}` : "—"}</td>
        <td className={td}>{rate.isActive ? "Yes" : "No"}</td>
        <td className={td}><button onClick={() => setEditing(true)} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10">Edit</button></td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-white/5">
      <td className={td}>{rate.provider}</td><td className={td}>{rate.operation}</td><td className={td}>{rate.model}</td>
      <td className={td}><input className={smallInput} type="number" min={0} step={0.01} value={inr} onChange={(e) => setInr(e.target.value)} /></td>
      <td className={td}><input className={smallInput} type="number" min={1} step={1} value={creditCost} onChange={(e) => setCreditCost(e.target.value)} /></td>
      <td className={td}>—</td><td className={td}>—</td>
      <td className={td}><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-[#2f7d5b]" /></td>
      <td className={td}>
        <div className="flex gap-1.5">
          <button onClick={save} disabled={busy} className="rounded-md bg-[#2f7d5b] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#2a704f] disabled:opacity-50">{busy ? "…" : "Save"}</button>
          <button onClick={() => { setEditing(false); setError(null); }} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/70 hover:bg-white/10">Cancel</button>
        </div>
        {error && <p role="alert" className="mt-1 text-[11px] text-[#ff8f8f]">{error}</p>}
      </td>
    </tr>
  );
}

const OPERATIONS = ["TEXT", "IMAGE", "VIDEO"] as const;

/** Inline "add rate" form so admins can register a new model + its cost. */
function AddRateForm({ token, onAdded }: { token: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [operation, setOperation] = useState<(typeof OPERATIONS)[number]>("TEXT");
  const [model, setModel] = useState("");
  const [creditCost, setCreditCost] = useState("");
  const [inr, setInr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const credits = Number(creditCost);
    const inrPaise = Math.round(Number(inr) * 100);
    if (!provider.trim() || !model.trim()) { setError("Provider and model are required"); return; }
    if (!Number.isInteger(credits) || credits <= 0) { setError("Credits must be a whole number > 0"); return; }
    if (!Number.isInteger(inrPaise) || inrPaise <= 0) { setError("INR cost must be greater than 0"); return; }
    setBusy(true); setError(null);
    try {
      await createCreditRate({ provider: provider.trim(), operation, model: model.trim(), creditCost: credits, inrCostPaise: inrPaise }, token);
      setProvider(""); setModel(""); setCreditCost(""); setInr(""); setOperation("TEXT"); setOpen(false);
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add rate");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <button onClick={() => setOpen(true)} className="mb-3 rounded-lg border border-white/15 px-4 py-2 text-[13px] font-medium text-white/80 hover:bg-white/10">＋ Add rate</button>;
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      {error && <p role="alert" className="mb-2 text-[13px] text-[#ff8f8f]">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div><span className="mb-1 block text-[11px] text-white/45">Provider</span><input className={smallInput} value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="openai" /></div>
        <div><span className="mb-1 block text-[11px] text-white/45">Operation</span><select className={smallInput} value={operation} onChange={(e) => setOperation(e.target.value as (typeof OPERATIONS)[number])}>{OPERATIONS.map((o) => <option key={o} value={o} className="bg-[#14171a]">{o}</option>)}</select></div>
        <div><span className="mb-1 block text-[11px] text-white/45">Model</span><input className={smallInput} value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" /></div>
        <div><span className="mb-1 block text-[11px] text-white/45">INR cost</span><input className={smallInput} type="number" min={0} step={0.01} value={inr} onChange={(e) => setInr(e.target.value)} placeholder="1.00" /></div>
        <div><span className="mb-1 block text-[11px] text-white/45">Credits</span><input className={smallInput} type="number" min={1} step={1} value={creditCost} onChange={(e) => setCreditCost(e.target.value)} placeholder="1" /></div>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={add} disabled={busy} className="rounded-lg bg-[#2f7d5b] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50">{busy ? "Adding…" : "Add rate"}</button>
        <button onClick={() => { setOpen(false); setError(null); }} className="rounded-lg border border-white/12 px-4 py-2 text-[13px] text-white/70 hover:bg-white/5">Cancel</button>
      </div>
    </div>
  );
}

function CostPanel({ token }: { token: string }) {
  const { data, error, loading, reload } = useAsync((tok) => adminCreditRates(tok), token);
  return (
    <div>
      <AddRateForm token={token} onAdded={reload} />
      {loading ? <Loading /> : error ? <ErrorLine text={error} /> : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.03]"><tr><th className={th}>Provider</th><th className={th}>Operation</th><th className={th}>Model</th><th className={th}>API cost</th><th className={th}>Credits</th><th className={th}>Revenue/gen</th><th className={th}>Margin</th><th className={th}>Active</th><th className={th}></th></tr></thead>
            <tbody>{data?.items.map((r: CreditRate) => (
              <RateRow key={r.id} rate={r} token={token} onChanged={reload} />
            ))}</tbody>
          </table>
          {data && data.items.length === 0 && <p className="p-4 text-[13px] text-white/40">No credit rates configured yet.</p>}
        </div>
      )}
    </div>
  );
}

const KINDS: Array<CreditTxnKind | "ALL"> = ["ALL", "PURCHASE", "USAGE", "REFUND", "GRANT"];
const KIND_LABEL: Record<CreditTxnKind, string> = { PURCHASE: "Purchase", USAGE: "Usage", REFUND: "Refund", GRANT: "Grant" };

/** Unified Creator Lab credit transaction history: purchases, usage, refunds, grants — filterable by kind / user / date. */
function TransactionsPanel({ token }: { token: string }) {
  const [kind, setKind] = useState<CreditTxnKind | "ALL">("ALL");
  const [email, setEmail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: CreditTransaction[]; total: number; totalPages: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to first page when filters change
  useEffect(() => { setPage(1); }, [kind, from, to]);
  useEffect(() => {
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setLoading(true); setError(null);
    adminCreditTransactions(token, { page, kind: kind === "ALL" ? undefined : kind, from: from || undefined, to: to || undefined })
      .then((d) => { if (live) setData(d); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [token, page, kind, from, to]);

  // Client-side email filter within the loaded page (admin endpoint filters by userId; email is a convenience).
  const rows = (data?.items ?? []).filter((r) => !email || r.user?.email.toLowerCase().includes(email.toLowerCase()));
  const kindColor: Record<CreditTxnKind, string> = { PURCHASE: "text-[#9fe0bd]", GRANT: "text-[#9fc3e0]", USAGE: "text-white/80", REFUND: "text-[#e0c89f]" };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="flex gap-1">{KINDS.map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-md border px-3 py-1.5 text-[12px] ${kind === k ? "border-[#c0d8cc] bg-white/10 text-white" : "border-white/12 text-white/60 hover:bg-white/5"}`}>{k === "ALL" ? "All" : KIND_LABEL[k]}</button>
        ))}</div>
        <label className="block"><span className="mb-1 block text-[11px] text-white/45">From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={smallInput} /></label>
        <label className="block"><span className="mb-1 block text-[11px] text-white/45">To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={smallInput} /></label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Filter email (this page)…" className="h-9 w-56 rounded-md border border-white/12 bg-white/[0.04] px-2 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-white/30" />
      </div>
      {loading ? <Loading /> : error ? <ErrorLine text={error} /> : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.03]"><tr><th className={th}>When</th><th className={th}>Kind</th><th className={th}>User</th><th className={th}>Model</th><th className={th}>Credits</th><th className={th}>Cash</th><th className={th}>API cost</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className={td}>{new Date(r.occurredAt).toLocaleString()}</td>
                <td className={`${td} font-medium ${kindColor[r.kind]}`}>{KIND_LABEL[r.kind]}</td>
                <td className={td}>{r.user?.email ?? "—"}</td>
                <td className={td}>{r.model ? `${r.provider}/${r.model}` : "—"}</td>
                <td className={`${td} ${r.credits < 0 ? "text-[#ff8f8f]" : "text-[#9fe0bd]"}`}>{r.credits > 0 ? `+${r.credits}` : r.credits}</td>
                <td className={td}>{r.cashPaise !== null ? rupees(r.cashPaise) : "—"}</td>
                <td className={td}>{r.costPaise !== null ? rupees(r.costPaise) : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
          {rows.length === 0 && <p className="p-4 text-[13px] text-white/40">No transactions.</p>}
        </div>
      )}
      {data && data.totalPages > 1 && (
        <div className="mt-3 flex items-center gap-3 text-[13px] text-white/60">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-white/12 px-3 py-1 disabled:opacity-40 hover:bg-white/5">Prev</button>
          <span>Page {page} / {data.totalPages} · {data.total} total</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-white/12 px-3 py-1 disabled:opacity-40 hover:bg-white/5">Next</button>
        </div>
      )}
    </div>
  );
}

/** One editable platform setting. Numbers store either rupees (paise x100) or raw; `rounding` is a select. */
function SettingField({ settingKey, label, hint, value, token, kind, options, onSaved }: {
  settingKey: string; label: string; hint?: string; value: unknown; token: string;
  kind: "rupees" | "int" | "float" | "select"; options?: string[]; onSaved: () => void;
}) {
  const initial = kind === "rupees" ? ((typeof value === "number" ? value : 0) / 100).toFixed(2) : String(value ?? (kind === "select" ? options?.[0] : 0));
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local input when the stored value loads/changes
  useEffect(() => { setVal(initial); }, [initial]);
  async function save() {
    setErr(null);
    let payload: number | string;
    if (kind === "select") payload = val;
    else if (kind === "rupees") payload = Math.round(Number(val) * 100);
    else payload = kind === "int" ? Math.round(Number(val)) : Number(val);
    if (kind !== "select" && (!Number.isFinite(payload as number) || (payload as number) < 0)) { setErr("Enter a valid non-negative number"); return; }
    setSaving(true);
    try { await updateSetting(settingKey, payload, token); setSaved(true); setTimeout(() => setSaved(false), 1800); onSaved(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  }
  return (
    <div className="flex items-end gap-3">
      <label className="block min-w-0 flex-1">
        <span className="mb-1 block text-[11px] text-white/45">{label}{hint ? <span className="text-white/30"> — {hint}</span> : null}</span>
        {kind === "select"
          ? <select className={smallInput} value={val} onChange={(e) => setVal(e.target.value)}>{options?.map((o) => <option key={o} value={o} className="bg-[#14171a]">{o}</option>)}</select>
          : <input className={smallInput} type="number" min={0} step={kind === "rupees" || kind === "float" ? 0.01 : 1} value={val} onChange={(e) => setVal(e.target.value)} />}
      </label>
      <button onClick={() => void save()} disabled={saving} className="h-9 shrink-0 rounded-md border border-white/15 px-4 text-[13px] text-white/85 hover:bg-white/10 disabled:opacity-50">{saving ? "…" : "Save"}</button>
      {saved && <span className="shrink-0 pb-1 text-[12px] text-[#9fe0bd]">Saved</span>}
      {err && <span className="shrink-0 pb-1 text-[12px] text-[#ff8f8f]">{err}</span>}
    </div>
  );
}

/** Platform settings: Creator Lab conversion rate + Viewer Wallet pricing rules. */
function SettingsPanel({ token }: { token: string }) {
  const { data, error, loading, reload } = useAsync((tok) => adminSettings(tok), token);
  if (loading) return <Loading />;
  if (error) return <ErrorLine text={error} />;
  const get = (k: string) => data?.items.find((s) => s.key === k)?.value;
  return (
    <div className="max-w-xl space-y-6">
      <section className="rounded-xl border border-white/8 p-5">
        <h3 className="text-[15px] font-semibold text-white">Creator Lab — credit economics</h3>
        <p className="mb-4 mt-1 text-[13px] text-white/45">The value of one Creator Lab Credit in rupees. Drives revenue/margin and defaults a new model&apos;s credit cost.</p>
        <SettingField settingKey="creator.credit.inrPerCreditPaise" label="₹ per credit" value={get("creator.credit.inrPerCreditPaise") ?? 100} token={token} kind="rupees" onSaved={reload} />
      </section>
      <section className="space-y-4 rounded-xl border border-white/8 p-5">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Viewer Wallet — pricing rules</h3>
          <p className="mt-1 text-[13px] text-white/45">Episodes have a credit price. The local value of one credit determines what viewers pay. An episode-specific country price takes priority.</p>
        </div>
        <SettingField settingKey="viewer.pricing.coinsPerMinute" label="Coins per minute" value={get("viewer.pricing.coinsPerMinute") ?? 1} token={token} kind="float" onSaved={reload} />
        <SettingField settingKey="viewer.pricing.rounding" label="Rounding" hint="fractional minutes" value={get("viewer.pricing.rounding") ?? "ceil"} token={token} kind="select" options={["ceil", "round", "floor"]} onSaved={reload} />
        <SettingField settingKey="viewer.pricing.minCoins" label="Minimum coins / paid episode" value={get("viewer.pricing.minCoins") ?? 1} token={token} kind="int" onSaved={reload} />
        <SettingField settingKey="viewer.pricing.maxCoins" label="Maximum coins / episode" hint="0 = no cap" value={get("viewer.pricing.maxCoins") ?? 0} token={token} kind="int" onSaved={reload} />
        <SettingField settingKey="viewer.wallet.inrPerCoinPaise" label="India: ₹ per episode credit" value={get("viewer.wallet.inrPerCoinPaise") ?? 100} token={token} kind="rupees" onSaved={reload} />
        <RegionalCreditRates token={token} rates={(get("viewer.credit.regionRates") ?? {}) as Record<string, { currency: string; amountMinor: number }>} onSaved={reload} />
      </section>
    </div>
  );
}

function RegionalCreditRates({ token, rates, onSaved }: { token: string; rates: Record<string, { currency: string; amountMinor: number }>; onSaved: () => void }) {
  const [us, setUs] = useState(rates.US ? (rates.US.amountMinor / 100).toFixed(2) : "");
  const [ae, setAe] = useState(rates.AE ? (rates.AE.amountMinor / 100).toFixed(2) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function save() {
    const next = { ...rates };
    for (const [country, currency, raw] of [["US", "USD", us], ["AE", "AED", ae]]) {
      if (!raw.trim()) { delete next[country]; continue; }
      const amountMinor = Math.round(Number(raw) * 100);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) { setError("Enter a positive amount, or leave a country blank for automatic conversion."); return; }
      next[country] = { currency, amountMinor };
    }
    setSaving(true); setError(null);
    try { await updateSetting("viewer.credit.regionRates", next, token); onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save rates"); }
    finally { setSaving(false); }
  }
  return <div className="space-y-3 border-t border-white/10 pt-4">
    <p className="text-[12px] text-white/50">Set a price for one credit by country. Blank uses the current INR exchange rate automatically. A 5-credit episode at $0.06 per credit costs $0.30.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label><span className="mb-1 block text-[11px] text-white/45">US: $ per credit</span><input className={smallInput} type="number" min="0.01" step="0.01" placeholder="Automatic conversion" value={us} onChange={(e) => setUs(e.target.value)} /></label>
      <label><span className="mb-1 block text-[11px] text-white/45">UAE: AED per credit</span><input className={smallInput} type="number" min="0.01" step="0.01" placeholder="Automatic conversion" value={ae} onChange={(e) => setAe(e.target.value)} /></label>
    </div>
    <button onClick={() => void save()} disabled={saving} className="rounded-md border border-white/15 px-4 py-2 text-[13px] text-white/85 disabled:opacity-50">{saving ? "Saving…" : "Save country rates"}</button>
    {error && <p role="alert" className="text-[12px] text-[#ff8f8f]">{error}</p>}
  </div>;
}

/** Currency-specific Viewer Wallet packs and payment history. */
function WalletPanel({ token }: { token: string }) {
  const packs = useAsync((tok) => adminWalletPacks(tok), token);
  const purchases = useAsync((tok) => adminWalletPurchases(tok), token);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<"INR" | "USD" | "AED">("INR");
  const [credit, setCredit] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function create() {
    const creditAmountMinor = Math.round(Number(credit) * 100);
    const pricePaise = Math.round(Number(price) * 100);
    if (!name.trim() || !Number.isInteger(creditAmountMinor) || creditAmountMinor <= 0 || !Number.isInteger(pricePaise) || pricePaise <= 0) { setError("Enter a name and positive amounts."); return; }
    setBusy(true); setError(null);
    try { await createWalletPack({ name: name.trim(), currency, creditAmountMinor, pricePaise }, token); setName(""); setCredit(""); setPrice(""); packs.reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not create pack"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-7">
    <section>
      <h3 className="mb-3 text-[15px] font-semibold">Wallet top-up packs</h3>
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/8 p-4 sm:grid-cols-5">
        <label><span className="text-[11px] text-white/45">Name</span><input className={smallInput} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label><span className="text-[11px] text-white/45">Currency</span><select className={smallInput} value={currency} onChange={(e) => setCurrency(e.target.value as "INR" | "USD" | "AED")}><option value="INR">INR</option><option value="USD">USD</option><option value="AED">AED</option></select></label>
        <label><span className="text-[11px] text-white/45">Wallet credit</span><input className={smallInput} type="number" min="0.01" step="0.01" value={credit} onChange={(e) => setCredit(e.target.value)} /></label>
        <label><span className="text-[11px] text-white/45">Charge</span><input className={smallInput} type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <button onClick={() => void create()} disabled={busy} className="self-end rounded-md bg-[#2f7d5b] px-3 py-2 text-[13px] disabled:opacity-50">Create pack</button>
        {error && <p className="col-span-full text-[12px] text-[#ff8f8f]">{error}</p>}
      </div>
      {packs.loading ? <Loading /> : packs.error ? <ErrorLine text={packs.error} /> : <div className="mt-3 overflow-x-auto rounded-xl border border-white/8"><table className="w-full"><thead><tr><th className={th}>Name</th><th className={th}>Currency</th><th className={th}>Wallet credit</th><th className={th}>Charge</th><th className={th}>Active</th><th className={th}></th></tr></thead><tbody>{packs.data?.items.map((p: WalletPack) => <WalletPackRow key={p.id} pack={p} token={token} onChanged={packs.reload} />)}</tbody></table></div>}
    </section>
    <section>
      <h3 className="mb-3 text-[15px] font-semibold">Recent top-ups</h3>
      {purchases.loading ? <Loading /> : purchases.error ? <ErrorLine text={purchases.error} /> : <div className="overflow-x-auto rounded-xl border border-white/8"><table className="w-full"><thead><tr><th className={th}>When</th><th className={th}>User</th><th className={th}>Pack</th><th className={th}>Credited</th><th className={th}>Charged</th><th className={th}>Status</th></tr></thead><tbody>{purchases.data?.items.map((p: WalletPurchase) => <tr key={p.id}><td className={td}>{new Date(p.createdAt).toLocaleString()}</td><td className={td}>{p.user?.email ?? "—"}</td><td className={td}>{p.pack?.name ?? "—"}</td><td className={td}>{formatMoney(p.amountCreditedMinor ?? 0, p.currency)}</td><td className={td}>{formatMoney(p.amountPaise, p.currency)}</td><td className={td}>{p.status}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

function WalletPackRow({ pack, token, onChanged }: { pack: WalletPack; token: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [credit, setCredit] = useState((pack.creditAmountMinor / 100).toFixed(2));
  const [price, setPrice] = useState((pack.pricePaise / 100).toFixed(2));
  const [active, setActive] = useState(pack.isActive);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    const creditAmountMinor = Math.round(Number(credit) * 100), pricePaise = Math.round(Number(price) * 100);
    if (creditAmountMinor <= 0 || pricePaise <= 0) { setError("Amounts must be positive"); return; }
    try { await updateWalletPack(pack.id, { creditAmountMinor, pricePaise, isActive: active }, token); setEditing(false); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save"); }
  }
  return <tr><td className={td}>{pack.name}</td><td className={td}>{pack.currency}</td>
    <td className={td}>{editing ? <input className={smallInput} type="number" step="0.01" value={credit} onChange={(e) => setCredit(e.target.value)} /> : formatMoney(pack.creditAmountMinor, pack.currency)}</td>
    <td className={td}>{editing ? <input className={smallInput} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /> : formatMoney(pack.pricePaise, pack.currency)}</td>
    <td className={td}>{editing ? <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> : pack.isActive ? "Yes" : "No"}</td>
    <td className={td}>{editing ? <button onClick={() => void save()}>Save</button> : <button onClick={() => setEditing(true)}>Edit</button>}{error && <p className="text-[#ff8f8f]">{error}</p>}</td>
  </tr>;
}

export default function AdminDashboard() {
  const { user, accessToken, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("Analytics");
  return (
    <div className="min-h-screen bg-[#0b0c0d] text-white">
      <header className="flex flex-wrap items-center gap-4 border-b border-white/8 px-6 py-4">
        <span className="text-[18px] font-bold tracking-[-0.5px]"><span className="text-[#c8e0d5] italic">s</span> admin</span>
        <span className="text-[13px] text-white/45">{user?.email}</span>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/" className="rounded-lg border border-white/12 px-3 py-1.5 text-[13px] text-white/75 hover:bg-white/5">Back to app</Link>
          <button onClick={() => void signOut()} className="rounded-lg border border-white/12 px-3 py-1.5 text-[13px] text-white/75 hover:bg-white/5">Log out</button>
        </div>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-white/8 px-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`shrink-0 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${tab === t ? "border-[#c0d8cc] text-white" : "border-transparent text-white/50 hover:text-white/80"}`}>{t}</button>
        ))}
      </nav>
      <main className="p-6">
        {!accessToken ? <Loading /> : tab === "Analytics" ? <AnalyticsPanel token={accessToken} />
          : tab === "Users" ? <UsersPanel token={accessToken} />
          : tab === "Content" ? <ContentPanel token={accessToken} />
          : tab === "Genres" ? <GenresPanel token={accessToken} />
          : tab === "Cost" ? <CostPanel token={accessToken} />
          : tab === "Transactions" ? <TransactionsPanel token={accessToken} />
          : tab === "Wallet" ? <WalletPanel token={accessToken} />
          : tab === "Settings" ? <SettingsPanel token={accessToken} />
          : tab === "Add YouTube" ? <AddVideo />
          : <CloudflareUpload />}
      </main>
    </div>
  );
}
