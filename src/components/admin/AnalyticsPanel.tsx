"use client";

import { useEffect, useState } from "react";
import {
  analyticsContent, analyticsCreator, analyticsFunnel, analyticsRevenue, analyticsUsers,
  type AnalyticsRange, type ContentAnalytics, type CreatorAnalytics, type FunnelAnalytics, type RevenueAnalytics, type UsersAnalytics,
} from "@/lib/admin";

const SUBTABS = ["Users", "Content", "Revenue", "Funnel", "Creator Lab"] as const;
type SubTab = (typeof SUBTABS)[number];
const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/40";
const td = "px-3 py-2 text-[13px] text-white/80";
const rupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function useRangeData<T>(fn: (r: AnalyticsRange) => Promise<T>, range: AnalyticsRange, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the range fetch below
    setLoading(true); setError(null);
    fn(range).then((d) => { if (live) setData(d); }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Failed to load"); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, loading };
}

const Card = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4"><div className="text-[11px] text-white/45">{label}</div><div className="mt-1 text-[22px] font-semibold text-white">{value}</div>{sub && <div className="mt-0.5 text-[11px] text-white/40">{sub}</div>}</div>
);

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="p-3 text-[13px] text-white/40">No data in this range.</p>;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-[12px] text-white/60">{r.label}</span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-white/[0.04]"><div className="h-full rounded bg-[#2f7d5b]" style={{ width: `${(r.value / max) * 100}%` }} /></div>
          <span className="w-12 shrink-0 text-right text-[12px] text-white/70">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

const Loading = () => <p className="text-[13px] text-white/40">Loading…</p>;
const ErrorLine = ({ text }: { text: string }) => <p role="alert" className="text-[13px] text-[#ff8f8f]">{text}</p>;
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-white/8 p-4"><h4 className="mb-3 text-[13px] font-semibold text-white/70">{title}</h4>{children}</section>
);

function UsersView({ token, range, deps }: { token: string; range: AnalyticsRange; deps: unknown[] }) {
  const { data, error, loading } = useRangeData((r) => analyticsUsers(token, r), range, deps);
  if (loading) return <Loading />; if (error) return <ErrorLine text={error} />; if (!data) return null;
  const t = data.totals;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Total users" value={t.totalUsers} /><Card label="New (range)" value={t.newUsers} />
        <Card label="DAU" value={t.dau} /><Card label="WAU" value={t.wau} />
        <Card label="MAU" value={t.mau} /><Card label="Active (range)" value={t.activeInRange} />
        <Card label="Returning" value={t.returningUsers} /><Card label="New active" value={t.newActiveUsers} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Device"><Bars rows={data.device.map((d) => ({ label: d.key ?? "Unknown", value: d.count }))} /></Section>
        <Section title="Operating system"><Bars rows={data.os.map((d) => ({ label: d.key ?? "Unknown", value: d.count }))} /></Section>
        <Section title="Browser"><Bars rows={data.browser.map((d) => ({ label: d.key ?? "Unknown", value: d.count }))} /></Section>
        <Section title="Traffic source"><Bars rows={data.source.map((d) => ({ label: d.key ?? "Unknown", value: d.count }))} /></Section>
        <Section title="Top countries"><Bars rows={data.geo.slice(0, 12).map((g) => ({ label: g.country, value: g.events }))} /></Section>
        <Section title="New users / day"><Bars rows={data.trend.map((d) => ({ label: new Date(d.day).toLocaleDateString(), value: d.newUsers }))} /></Section>
      </div>
    </div>
  );
}

function ContentView({ token, range, deps }: { token: string; range: AnalyticsRange; deps: unknown[] }) {
  const { data, error, loading } = useRangeData((r) => analyticsContent(token, r), range, deps);
  if (loading) return <Loading />; if (error) return <ErrorLine text={error} />; if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Card label="Total views (range)" value={data.totalViews} /><Card label="Titles with views" value={data.items.length} /></div>
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full border-collapse">
          <thead className="bg-white/[0.03]"><tr><th className={th}>Title</th><th className={th}>Type</th><th className={th}>Unique viewers</th><th className={th}>Starts</th><th className={th}>Completes</th><th className={th}>Completion</th><th className={th}>Avg % watched</th></tr></thead>
          <tbody>{data.items.map((c) => (
            <tr key={c.id} className="border-t border-white/5"><td className={td}>{c.title}</td><td className={td}>{c.type}</td><td className={td}>{c.uniqueViewers}</td><td className={td}>{c.starts}</td><td className={td}>{c.completes}</td><td className={td}>{pct(c.completionRate)}</td><td className={td}>{c.avgPercentComplete != null ? pct(c.avgPercentComplete) : "—"}</td></tr>
          ))}</tbody>
        </table>
        {data.items.length === 0 && <p className="p-4 text-[13px] text-white/40">No watch data in this range.</p>}
      </div>
    </div>
  );
}

function RevenueView({ token, range, deps }: { token: string; range: AnalyticsRange; deps: unknown[] }) {
  const { data, error, loading } = useRangeData((r) => analyticsRevenue(token, r), range, deps);
  if (loading) return <Loading />; if (error) return <ErrorLine text={error} />; if (!data) return null;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Total revenue" value={rupees(data.totalRevenuePaise)} />
        <Card label="Paying users" value={data.payingUsers} /><Card label="ARPPU" value={rupees(data.arppuPaise)} />
        <Card label="Reg → payment" value={pct(data.registrationToPayment)} />
        <Card label="Successful payments" value={data.successfulPayments} /><Card label="Failed payments" value={data.failedPayments} />
        <Card label="Episode unlocks" value={data.episodeUnlocks} /><Card label="Coins spent" value={data.coinsSpentOnUnlocks} />
      </div>
      <Section title="Revenue by stream">
        <Bars rows={[{ label: "Viewer Wallet", value: Math.round(data.byStream.walletPaise / 100) }, { label: "Creator credits", value: Math.round(data.byStream.creditPaise / 100) }, { label: "Series packages", value: Math.round(data.byStream.packagePaise / 100) }]} />
        <p className="mt-2 text-[11px] text-white/40">Bars in ₹.</p>
      </Section>
    </div>
  );
}

function FunnelView({ token, range, deps }: { token: string; range: AnalyticsRange; deps: unknown[] }) {
  const { data, error, loading } = useRangeData((r) => analyticsFunnel(token, r), range, deps);
  if (loading) return <Loading />; if (error) return <ErrorLine text={error} />; if (!data) return null;
  const top = Math.max(1, ...data.stages.map((s) => s.users));
  return (
    <div className="space-y-2">
      {data.stages.map((s, i) => {
        const prev = i > 0 ? data.stages[i - 1].users : s.users;
        const dropFromPrev = prev > 0 ? 1 - s.users / prev : 0;
        return (
          <div key={s.stage} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-[12px] text-white/60">{s.stage}</span>
            <div className="h-6 flex-1 overflow-hidden rounded bg-white/[0.04]"><div className="flex h-full items-center rounded bg-[#2f7d5b] px-2 text-[11px] text-white" style={{ width: `${(s.users / top) * 100}%` }}>{s.users}</div></div>
            <span className="w-24 shrink-0 text-right text-[11px] text-white/40">{i > 0 ? `−${pct(dropFromPrev)}` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

function CreatorView({ token, range, deps }: { token: string; range: AnalyticsRange; deps: unknown[] }) {
  const { data, error, loading } = useRangeData((r) => analyticsCreator(token, r), range, deps);
  if (loading) return <Loading />; if (error) return <ErrorLine text={error} />; if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Generations" value={data.totals.generations} /><Card label="Succeeded" value={data.totals.succeeded} />
        <Card label="Failed" value={data.totals.failed} /><Card label="Failure rate" value={pct(data.totals.failureRate)} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full border-collapse">
          <thead className="bg-white/[0.03]"><tr><th className={th}>Model</th><th className={th}>Op</th><th className={th}>Gens</th><th className={th}>Fail rate</th><th className={th}>Avg latency</th><th className={th}>Credits</th><th className={th}>API cost</th><th className={th}>Margin</th></tr></thead>
          <tbody>{data.models.map((m, i) => (
            <tr key={i} className="border-t border-white/5"><td className={td}>{m.provider}/{m.model}</td><td className={td}>{m.operation}</td><td className={td}>{m.generations}</td><td className={td}>{pct(m.failureRate)}</td><td className={td}>{m.avgLatencyMs != null ? `${(m.avgLatencyMs / 1000).toFixed(1)}s` : "—"}</td><td className={td}>{m.creditsUsed}</td><td className={td}>{rupees(m.apiCostPaise)}</td><td className={`${td} ${m.marginPaise < 0 ? "text-[#ff8f8f]" : "text-[#9fe0bd]"}`}>{rupees(m.marginPaise)}</td></tr>
          ))}</tbody>
        </table>
        {data.models.length === 0 && <p className="p-4 text-[13px] text-white/40">No generations in this range.</p>}
      </div>
    </div>
  );
}

export default function AnalyticsPanel({ token }: { token: string }) {
  const [sub, setSub] = useState<SubTab>("Users");
  const [today] = useState(() => iso(new Date()));
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date()));
  const range: AnalyticsRange = { from: from || undefined, to: to ? `${to}T23:59:59` : undefined };
  const deps = [token, from, to, sub];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 overflow-x-auto">{SUBTABS.map((s) => (
          <button key={s} onClick={() => setSub(s)} className={`shrink-0 rounded-md border px-3 py-1.5 text-[12px] ${sub === s ? "border-[#c0d8cc] bg-white/10 text-white" : "border-white/12 text-white/60 hover:bg-white/5"}`}>{s}</button>
        ))}</div>
        <div className="ml-auto flex items-end gap-2">
          <label className="block"><span className="mb-1 block text-[11px] text-white/45">From</span><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-white/12 bg-white/[0.04] px-2 text-[13px] text-white outline-none focus:border-white/30" /></label>
          <label className="block"><span className="mb-1 block text-[11px] text-white/45">To</span><input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-white/12 bg-white/[0.04] px-2 text-[13px] text-white outline-none focus:border-white/30" /></label>
        </div>
      </div>
      {sub === "Users" ? <UsersView token={token} range={range} deps={deps} />
        : sub === "Content" ? <ContentView token={token} range={range} deps={deps} />
        : sub === "Revenue" ? <RevenueView token={token} range={range} deps={deps} />
        : sub === "Funnel" ? <FunnelView token={token} range={range} deps={deps} />
        : <CreatorView token={token} range={range} deps={deps} />}
    </div>
  );
}
