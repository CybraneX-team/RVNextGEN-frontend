"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import {
  adminCreditRates, adminOverview, adminUploads, adminUsers, createCreditRate, updateCreditRate,
  type AdminUpload, type AdminUser, type CreditRate, type Overview,
} from "@/lib/admin";
import { deleteContent } from "@/lib/admin";
import AddVideo from "./AddVideo";
import CloudflareUpload from "./CloudflareUpload";
import EditContentModal from "./EditContentModal";
import GenresPanel from "./GenresPanel";
import GrantCreditsDialog from "./GrantCreditsDialog";

const TABS = ["Overview", "Users", "Content", "Genres", "Cost", "Add YouTube", "Add Cloudflare"] as const;
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

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4"><div className="text-[12px] text-white/45">{label}</div><div className="mt-1 text-[24px] font-semibold text-white">{value}</div></div>;
}

const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/40";
const td = "px-3 py-2 text-[13px] text-white/80";
const Loading = () => <p className="text-[13px] text-white/40">Loading…</p>;
const ErrorLine = ({ text }: { text: string }) => <p role="alert" className="text-[13px] text-[#ff8f8f]">{text}</p>;

function OverviewPanel({ token }: { token: string }) {
  const { data, error, loading } = useAsync<Overview>(adminOverview, token);
  if (loading) return <Loading />;
  if (error) return <ErrorLine text={error} />;
  if (!data) return null;
  const t = data.totals;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Stat label="Users" value={t.users} /><Stat label="Paid" value={t.paidUsers} /><Stat label="Free" value={t.freeUsers} />
      <Stat label="Content" value={t.content} /><Stat label="Views" value={t.views} /><Stat label="Generations" value={t.generations} />
    </div>
  );
}

function UsersPanel({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useAsync((tok) => adminUsers(tok, q || undefined), token, [q]);
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or name…" className="mb-3 h-10 w-full max-w-sm rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-white/30" />
      {loading ? <Loading /> : error ? <ErrorLine text={error} /> : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.03]"><tr><th className={th}>Email</th><th className={th}>Name</th><th className={th}>Role</th><th className={th}>Credits</th><th className={th}>Verified</th><th className={th}></th></tr></thead>
            <tbody>{data?.items.map((u: AdminUser) => (
              <tr key={u.id} className="border-t border-white/5"><td className={td}>{u.email}</td><td className={td}>{u.profile?.displayName ?? "—"}</td><td className={td}>{u.role}</td><td className={td}>{u.creditsBalance}</td><td className={td}>{u.emailVerifiedAt ? "Yes" : "No"}</td><td className={td}><button onClick={() => setGrantUser(u)} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10">＋ Credits</button></td></tr>
            ))}</tbody>
          </table>
          {data && data.items.length === 0 && <p className="p-4 text-[13px] text-white/40">No users found.</p>}
        </div>
      )}
      {grantUser && <GrantCreditsDialog user={grantUser} token={token} onClose={() => setGrantUser(null)} onGranted={reload} />}
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
        <td className={td}>₹{(rate.inrCostPaise / 100).toFixed(2)}</td><td className={td}>{rate.creditCost}</td><td className={td}>{rate.isActive ? "Yes" : "No"}</td>
        <td className={td}><button onClick={() => setEditing(true)} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10">Edit</button></td>
      </tr>
    );
  }
  return (
    <tr className="border-t border-white/5">
      <td className={td}>{rate.provider}</td><td className={td}>{rate.operation}</td><td className={td}>{rate.model}</td>
      <td className={td}><input className={smallInput} type="number" min={0} step={0.01} value={inr} onChange={(e) => setInr(e.target.value)} /></td>
      <td className={td}><input className={smallInput} type="number" min={1} step={1} value={creditCost} onChange={(e) => setCreditCost(e.target.value)} /></td>
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
            <thead className="bg-white/[0.03]"><tr><th className={th}>Provider</th><th className={th}>Operation</th><th className={th}>Model</th><th className={th}>INR cost</th><th className={th}>Credits</th><th className={th}>Active</th><th className={th}></th></tr></thead>
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

export default function AdminDashboard() {
  const { user, accessToken, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("Overview");
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
        {!accessToken ? <Loading /> : tab === "Overview" ? <OverviewPanel token={accessToken} />
          : tab === "Users" ? <UsersPanel token={accessToken} />
          : tab === "Content" ? <ContentPanel token={accessToken} />
          : tab === "Genres" ? <GenresPanel token={accessToken} />
          : tab === "Cost" ? <CostPanel token={accessToken} />
          : tab === "Add YouTube" ? <AddVideo />
          : <CloudflareUpload />}
      </main>
    </div>
  );
}
