"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import {
  adminCreditRates, adminOverview, adminUploads, adminUsers,
  type AdminUpload, type AdminUser, type CreditRate, type Overview,
} from "@/lib/admin";
import AddVideo from "./AddVideo";
import EditContentModal from "./EditContentModal";

const TABS = ["Overview", "Users", "Content", "Cost", "Add video"] as const;
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
  const { data, error, loading } = useAsync((tok) => adminUsers(tok, q || undefined), token, [q]);
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or name…" className="mb-3 h-10 w-full max-w-sm rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-white/30" />
      {loading ? <Loading /> : error ? <ErrorLine text={error} /> : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.03]"><tr><th className={th}>Email</th><th className={th}>Name</th><th className={th}>Role</th><th className={th}>Credits</th><th className={th}>Verified</th></tr></thead>
            <tbody>{data?.items.map((u: AdminUser) => (
              <tr key={u.id} className="border-t border-white/5"><td className={td}>{u.email}</td><td className={td}>{u.profile?.displayName ?? "—"}</td><td className={td}>{u.role}</td><td className={td}>{u.creditsBalance}</td><td className={td}>{u.emailVerifiedAt ? "Yes" : "No"}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
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
            <thead className="bg-white/[0.03]"><tr><th className={th}>Title</th><th className={th}>Source</th><th className={th}>Visibility</th><th className={th}>Ready</th><th className={th}>Creator</th><th className={th}></th></tr></thead>
            <tbody>{data?.items.map((c: AdminUpload) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className={td}>{c.title}</td>
                <td className={td}>{c.videoSource}</td>
                <td className={td}>{c.visibility}</td>
                <td className={td}>{c.videoSource === "YOUTUBE" ? "—" : c.streamReady == null ? "—" : c.streamReady ? "Yes" : "No"}</td>
                <td className={td}>{c.creator?.email ?? "—"}</td>
                <td className={td}><button onClick={() => setEditId(c.id)} className="rounded-md border border-white/15 px-3 py-1 text-[12px] text-white/80 hover:bg-white/10">Edit</button></td>
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

function CostPanel({ token }: { token: string }) {
  const { data, error, loading } = useAsync((tok) => adminCreditRates(tok), token);
  if (loading) return <Loading />;
  if (error) return <ErrorLine text={error} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/8">
      <table className="w-full border-collapse">
        <thead className="bg-white/[0.03]"><tr><th className={th}>Provider</th><th className={th}>Operation</th><th className={th}>Model</th><th className={th}>INR cost</th><th className={th}>Credits</th><th className={th}>Active</th></tr></thead>
        <tbody>{data?.items.map((r: CreditRate) => (
          <tr key={r.id} className="border-t border-white/5"><td className={td}>{r.provider}</td><td className={td}>{r.operation}</td><td className={td}>{r.model}</td><td className={td}>₹{(r.inrCostPaise / 100).toFixed(2)}</td><td className={td}>{r.creditCost}</td><td className={td}>{r.isActive ? "Yes" : "No"}</td></tr>
        ))}</tbody>
      </table>
      {data && data.items.length === 0 && <p className="p-4 text-[13px] text-white/40">No credit rates configured yet.</p>}
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
          : tab === "Cost" ? <CostPanel token={accessToken} />
          : <AddVideo />}
      </main>
    </div>
  );
}
