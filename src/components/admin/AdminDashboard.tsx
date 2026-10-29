"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft, CloudUpload, Cpu, Film, LayoutDashboard, LogOut, Package, Pencil, Plus, ReceiptText, SlidersHorizontal, SquarePlay, Tags, Users, type LucideIcon,
} from "lucide-react";
import { useAuth } from "../AuthProvider";
import {
  adminCreditRates, adminCreditTransactions, adminSettings, adminUploads, adminUsers, createCreditRate, updateCreditRate, updateSetting, userCreatorEconomics,
  type AdminUpload, type AdminUser, type CreditRate, type CreditTransaction, type CreditTxnKind, type UserEconomics,
} from "@/lib/admin";
import { deleteContent } from "@/lib/admin";
import AddVideo from "./AddVideo";
import CloudflareUpload from "./CloudflareUpload";
import EditContentModal from "./EditContentModal";
import GenresPanel from "./GenresPanel";
import GrantCreditsDialog from "./GrantCreditsDialog";
import AnalyticsPanel from "./AnalyticsPanel";
import PacksPanel from "./PacksPanel";
import WalletAdjustDialog, { walletLabel } from "./WalletAdjustDialog";
import { Badge, Button, Card, Dialog, EmptyState, ErrorLine, Field, Loading, Notice, PageHeader, Segmented, Switch, inputClass, tdClass as td, thClass as th, useAsync } from "./ui";

type Tab = "dashboard" | "users" | "content" | "add-youtube" | "add-cloudflare" | "genres" | "packs" | "pricing" | "ai-costs" | "transactions";
type NavItem = { id: Tab; label: string; icon: LucideIcon; title: string; description: string };

/** Sidebar groups, in the order an operator usually works: look, manage content, manage people, manage money. */
const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Overview", items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, title: "Dashboard", description: "Users, activity, where visitors come from, revenue and AI usage. Change the From and To dates to look at another period." },
  ] },
  { group: "Content", items: [
    { id: "content", label: "All content", icon: Film, title: "All content", description: "Every movie, series and episode. Edit details, set episode prices, publish or delete." },
    { id: "add-youtube", label: "Add from YouTube", icon: SquarePlay, title: "Add from YouTube", description: "Paste a YouTube link to add a movie, or build a series season by season. YouTube videos play straight away." },
    { id: "add-cloudflare", label: "Upload video", icon: CloudUpload, title: "Upload video (Cloudflare)", description: "Upload your own video files. Best for paid content: the video stays private and only buyers can watch it." },
    { id: "genres", label: "Genres", icon: Tags, title: "Genres", description: "The categories viewers browse by. Removing a genre never removes its titles." },
  ] },
  { group: "People", items: [
    { id: "users", label: "Users", icon: Users, title: "Users", description: "Find any account, see both credit balances, add or remove credits, and see what each creator spends." },
  ] },
  { group: "Money", items: [
    { id: "packs", label: "Credit packs", icon: Package, title: "Credit packs", description: "What people can buy: Episode Credits packs for watching, and Creator Lab packs for AI generation, in each currency." },
    { id: "pricing", label: "Pricing settings", icon: SlidersHorizontal, title: "Pricing settings", description: "What one credit is worth, and the rules that price episodes in India, the US and the UAE." },
    { id: "ai-costs", label: "AI models & margin", icon: Cpu, title: "AI models & margin", description: "What each AI model costs you, the profit you add on top, and which models creators can use." },
    { id: "transactions", label: "Credit history", icon: ReceiptText, title: "Creator Lab credit history", description: "Every Creator Lab credit movement: purchases, usage, refunds and credits you granted." },
  ] },
];
const ITEMS = NAV.flatMap((g) => g.items);
const isTab = (v: string): v is Tab => ITEMS.some((i) => i.id === v);

const rupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;
/** Credit amounts are stored in millicredits (1 credit = 1000 mc); show them as credits. */
const credits = (mc: number | null | undefined) => ((mc ?? 0) / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 });

// ---------------------------------------------------------------- Users

function UsersPanel({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "free">("all");
  const { data, error, loading, reload } = useAsync((tok) => adminUsers(tok, q || undefined, filter === "all" ? undefined : filter), token, [q, filter]);
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);
  const [walletUser, setWalletUser] = useState<AdminUser | null>(null);
  const [econUser, setEconUser] = useState<AdminUser | null>(null);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or name…" aria-label="Search users" className={`${inputClass} max-w-sm`} />
        <Segmented label="Filter users" value={filter} onChange={setFilter} options={[{ value: "all", label: "Everyone" }, { value: "paid", label: "Paying" }, { value: "free", label: "Never paid" }]} />
      </div>
      {loading ? <Loading /> : error ? <ErrorLine text={error} /> : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.03]"><tr><th className={th}>User</th><th className={th}>Creator Lab credits</th><th className={th}>Episode credits</th><th className={th}>Joined</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{data?.items.map((u: AdminUser) => {
              const wallet = (u.walletBalances ?? []).filter((b) => b.balanceMinor !== 0);
              return (
                <tr key={u.id} className="border-t border-white/5">
                  <td className={td}>
                    <div className="font-medium text-white">{u.profile?.displayName ?? u.email}</div>
                    <div className="text-[12px] text-white/45">{u.email}</div>
                    <div className="mt-1 flex gap-1.5">
                      <Badge tone={u.role === "ADMIN" ? "info" : "neutral"}>{u.role === "ADMIN" ? "Admin" : u.role === "CREATOR" ? "Creator" : "Viewer"}</Badge>
                      {u.emailVerifiedAt ? <Badge tone="good">Email verified</Badge> : <Badge tone="warn">Email not verified</Badge>}
                    </div>
                  </td>
                  <td className={td}>{credits(u.creditsBalance)}</td>
                  <td className={td}>{wallet.length ? wallet.map((b) => walletLabel(b.balanceMinor, b.currency)).join(" · ") : "0 credits"}</td>
                  <td className={`${td} text-white/50`}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className={td}>
                    <div className="flex min-w-[150px] flex-col items-stretch gap-1.5">
                      <Button size="sm" onClick={() => setGrantUser(u)} title="Give free Creator Lab credits">＋ Creator Lab credits</Button>
                      <Button size="sm" onClick={() => setWalletUser(u)} title="Add or remove episode credits">± Episode credits</Button>
                      <Button size="sm" tone="ghost" onClick={() => setEconUser(u)} title="Creator Lab spending, cost and profit">View spending</Button>
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
          {data && data.items.length === 0 && <EmptyState>No users match this search.</EmptyState>}
        </div>
      )}
      {grantUser && <GrantCreditsDialog user={grantUser} token={token} onClose={() => setGrantUser(null)} onGranted={reload} />}
      {walletUser && <WalletAdjustDialog user={walletUser} token={token} onClose={() => setWalletUser(null)} onDone={reload} />}
      {econUser && <EconomicsDialog user={econUser} token={token} onClose={() => setEconUser(null)} />}
    </div>
  );
}

/** Read-only per-user Creator Lab economics (credits, API cost, revenue, P/L + per-model breakdown). */
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
    <Dialog title="Creator Lab spending" subtitle={user.email} onClose={onClose} wide>
      {error ? <ErrorLine text={error} /> : !s ? <Loading /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <EconStat label="Credits left" value={credits(s.creditsBalance)} />
            <EconStat label="Credits bought" value={credits(s.creditsBought)} />
            <EconStat label="Credits given free" value={credits(s.creditsGranted)} />
            <EconStat label="Credits used" value={credits(s.creditsConsumed)} />
            <EconStat label="Credits refunded" value={credits(s.creditsRefunded)} />
            <EconStat label="Money paid" value={rupees(s.revenuePaise)} />
            <EconStat label="AI cost to you" value={rupees(s.apiExpenditurePaise)} />
            <EconStat label="Profit / loss" value={rupees(s.profitLossPaise)} tone={s.profitLossPaise < 0 ? "bad" : "good"} />
            <EconStat label="Value of credits used" value={rupees(s.creditValuePaise)} />
          </div>
          <h3 className="mb-2 mt-5 text-[13px] font-semibold text-white/70">By AI model</h3>
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full border-collapse">
              <thead className="bg-white/[0.03]"><tr><th className={th}>Model</th><th className={th}>Used for</th><th className={th}>Runs</th><th className={th}>Credits</th><th className={th}>AI cost</th><th className={th}>Margin</th></tr></thead>
              <tbody>{data.byModel.map((m, i) => (
                <tr key={i} className="border-t border-white/5"><td className={td}>{m.provider}/{m.model}</td><td className={td}>{OPERATION_LABEL[m.operation as Operation] ?? m.operation}</td><td className={td}>{m.generations}</td><td className={td}>{credits(m.creditsConsumed)}</td><td className={td}>{rupees(m.apiCostPaise)}</td><td className={`${td} ${m.marginPaise < 0 ? "text-[#ff8f8f]" : "text-[#9fe0bd]"}`}>{rupees(m.marginPaise)}</td></tr>
              ))}</tbody>
            </table>
            {data.byModel.length === 0 && <EmptyState>No generations yet.</EmptyState>}
          </div>
        </>
      )}
    </Dialog>
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

// ---------------------------------------------------------------- Content

/** Two-click delete for a title: first click arms, second confirms. */
function DeleteTitleButton({ id, title, token, onDeleted }: { id: string; title: string; token: string; onDeleted: () => void }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try { await deleteContent(id, token); onDeleted(); }
    catch { setBusy(false); setArmed(false); }
  }
  if (!armed) return <Button size="sm" tone="danger" onClick={() => setArmed(true)} title={`Delete “${title}”`}>Delete</Button>;
  return (
    <span className="inline-flex gap-1.5">
      <Button size="sm" onClick={remove} disabled={busy} className="!bg-[#8f2f2f] !text-white">{busy ? "…" : "Yes, delete"}</Button>
      <Button size="sm" onClick={() => setArmed(false)}>Keep</Button>
    </span>
  );
}

const TYPE_LABEL: Record<string, string> = { MOVIE: "Movie", SERIES: "Series", EPISODE: "Episode", SHORT: "Short" };

function VisibilityBadge({ value }: { value: string }) {
  if (value === "PUBLISHED") return <Badge tone="good">Live</Badge>;
  if (value === "DRAFT") return <Badge tone="warn">Draft</Badge>;
  if (value === "PRIVATE") return <Badge>Hidden</Badge>;
  return <Badge>{value.charAt(0) + value.slice(1).toLowerCase()}</Badge>;
}

function ContentPanel({ token }: { token: string }) {
  const [q, setQ] = useState("");
  const [origin, setOrigin] = useState<"all" | "direct" | "generated">("all");
  const { data, error, loading, reload } = useAsync((tok) => adminUploads(tok, q || undefined, origin === "all" ? undefined : origin), token, [q, origin]);
  const [editId, setEditId] = useState<string | null>(null);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles…" aria-label="Search titles" className={`${inputClass} max-w-sm`} />
        <Segmented label="Where it came from" value={origin} onChange={setOrigin} options={[{ value: "all", label: "Everything" }, { value: "direct", label: "Added by admins" }, { value: "generated", label: "From Creator Lab" }]} />
      </div>
      <p className="mb-3 text-[12px] text-white/40"><Badge tone="good">Live</Badge> viewers can see it · <Badge tone="warn">Draft</Badge> only admins can see it · Video ready applies to uploaded videos, which take a few minutes to process.</p>
      {loading ? <Loading /> : error ? <ErrorLine text={error} /> : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.03]"><tr><th className={th}>Title</th><th className={th}>Type</th><th className={th}>Video from</th><th className={th}>Status</th><th className={th}>Video ready</th><th className={th}>Made by</th><th className={th}></th></tr></thead>
            <tbody>{data?.items.map((c: AdminUpload) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className={td}>
                  <div className="flex items-center gap-3">
                    {c.posterUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={c.posterUrl} alt="" className="h-9 w-16 shrink-0 rounded object-cover" referrerPolicy="no-referrer" />
                      : <div className="grid h-9 w-16 shrink-0 place-items-center rounded bg-white/5 text-[10px] text-white/30">—</div>}
                    <span className="truncate font-medium text-white">{c.title}</span>
                  </div>
                </td>
                <td className={td}>{TYPE_LABEL[c.type] ?? c.type}</td>
                <td className={td}><span className={`rounded-full px-2 py-0.5 text-[11px] ${c.videoSource === "YOUTUBE" ? "bg-[#d33]/15 text-[#ff9a9a]" : "bg-[#f6821f]/15 text-[#f6a95f]"}`}>{c.videoSource === "YOUTUBE" ? "YouTube" : "Cloudflare"}</span></td>
                <td className={td}><VisibilityBadge value={c.visibility} /></td>
                <td className={td}>{c.videoSource === "YOUTUBE" || c.streamReady == null ? <span className="text-white/35">—</span> : c.streamReady ? <Badge tone="good">Ready</Badge> : <Badge tone="warn">Processing</Badge>}</td>
                <td className={`${td} text-white/55`}>{c.creator?.email ?? "Admin"}</td>
                <td className={td}><div className="flex justify-end gap-1.5"><Button size="sm" onClick={() => setEditId(c.id)}>Edit</Button><DeleteTitleButton id={c.id} title={c.title} token={token} onDeleted={reload} /></div></td>
              </tr>
            ))}</tbody>
          </table>
          {data && data.items.length === 0 && <EmptyState>No titles found.</EmptyState>}
        </div>
      )}
      {editId && <EditContentModal id={editId} token={token} onClose={() => setEditId(null)} onSaved={reload} />}
    </div>
  );
}

// ---------------------------------------------------------------- AI models & margin

type Operation = "TEXT" | "IMAGE" | "VIDEO";
const OPERATIONS: Operation[] = ["TEXT", "IMAGE", "VIDEO"];
const OPERATION_LABEL: Record<Operation, string> = { TEXT: "Story & screenplay", IMAGE: "Characters & scenes", VIDEO: "Animation (video)" };
const KNOWN_PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)" }, { id: "openai", label: "OpenAI (GPT)" }, { id: "xai", label: "xAI (Grok)" },
  { id: "groq", label: "Groq" }, { id: "openrouter", label: "OpenRouter" }, { id: "fal", label: "fal (images & video)" }, { id: "higgsfield", label: "Higgsfield (video)" },
];

const paise = (p: number | null | undefined) => `₹${((p ?? 0) / 100).toFixed(2)}`;
/** Short per-unit rate label for a credit rate, by metering unit. */
function unitRateLabel(r: CreditRate): string {
  switch (r.unit) {
    case "PER_TOKEN": return `in ${paise(r.inputPaisePerMillion)} · out ${paise(r.outputPaisePerMillion)} / 1M tokens`;
    case "PER_MEGAPIXEL": return `${paise(r.paisePerMegapixel)} / megapixel`;
    case "PER_SECOND": return `${paise(r.paisePerSecond)} / second`;
    default: return `${paise(r.inrCostPaise)} / generation`;
  }
}

/** One AI model row: the provider's rate, its margin and a typical charge. The switch turns the model on or off at once. */
function RateRow({ rate, token, defaultMarginBps, onChanged }: { rate: CreditRate; token: string; defaultMarginBps: number; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [marginPct, setMarginPct] = useState(rate.marginBps != null ? String(rate.marginBps / 100) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effBps = rate.effectiveMarginBps ?? defaultMarginBps;
  const inherits = rate.marginBps == null;

  async function save(body: { marginBps?: number | null; isActive?: boolean }) {
    setBusy(true); setError(null);
    try { await updateCreditRate(rate.id, body, token); setEditing(false); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save"); }
    finally { setBusy(false); }
  }

  function saveMargin() {
    const trimmed = marginPct.trim();
    if (trimmed === "") { void save({ marginBps: null }); return; }
    const pct = Number(trimmed);
    if (!Number.isFinite(pct) || pct < 0) { setError("Enter a percentage of 0 or more, or leave it empty to use the global margin."); return; }
    void save({ marginBps: Math.round(pct * 100) });
  }

  return (
    <tr className={`border-t border-white/5 ${rate.isActive ? "" : "opacity-55"}`}>
      <td className={`${td} min-w-[170px]`}><div className="max-w-[240px] font-medium text-white [overflow-wrap:anywhere]">{rate.model}</div><div className="text-[12px] text-white/45">{rate.provider}</div></td>
      <td className={`${td} min-w-[150px] text-white/70`}>{unitRateLabel(rate)}</td>
      <td className={`${td} min-w-[120px]`}>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input className={`${inputClass} h-8 w-20`} aria-label="Margin percent" type="number" min={0} step={0.5} value={marginPct} onChange={(e) => setMarginPct(e.target.value)} placeholder={String(defaultMarginBps / 100)} autoFocus />
            <span className="text-white/50">%</span>
            <Button size="sm" tone="primary" disabled={busy} onClick={saveMargin}>Save</Button>
            <Button size="sm" onClick={() => { setEditing(false); setError(null); setMarginPct(rate.marginBps != null ? String(rate.marginBps / 100) : ""); }}>Cancel</Button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-md border border-white/12 px-2 py-1 text-left hover:bg-white/8" title="Change this model's margin">
            {(effBps / 100).toFixed(effBps % 100 === 0 ? 0 : 1)}%{inherits ? <span className="text-white/35">global</span> : <span className="text-[#f0c98a]">own</span>}<Pencil className="size-3 text-white/40" />
          </button>
        )}
        {editing && <p className="mt-1 text-[11px] text-white/40">Leave empty to follow the global margin.</p>}
        {error && <p className="mt-1 text-[11px] text-[#ff8f8f]">{error}</p>}
      </td>
      <td className={`${td} whitespace-nowrap`}><span className="text-white/55">{paise(rate.exampleCostPaise)}</span> → <span className="font-medium text-white">{credits(rate.exampleMc)} cr</span></td>
      <td className={td}><Switch checked={rate.isActive} disabled={busy} label={`Make ${rate.model} available`} onChange={(v) => void save({ isActive: v })} /></td>
    </tr>
  );
}

/** Global profit margin control — applies to every model that has no per-model override. */
function GlobalMarginCard({ token, defaultMarginBps, inrPerCreditPaise, onSaved }: { token: string; defaultMarginBps: number; inrPerCreditPaise: number; onSaved: () => void }) {
  const [pct, setPct] = useState(String(defaultMarginBps / 100));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const value = Number(pct);
  const exampleCost = 10000; // ₹100 of AI cost
  const exampleSell = Number.isFinite(value) && value >= 0 ? Math.ceil(exampleCost * (1 + value / 100)) : null;

  async function save() {
    if (!Number.isFinite(value) || value < 0) { setMsg({ tone: "error", text: "Enter a percentage of 0 or more." }); return; }
    setBusy(true); setMsg(null);
    try { await updateSetting("creator.credit.marginBpsDefault", Math.round(value * 100), token); setMsg({ tone: "success", text: "Saved. Every model without its own margin now uses this." }); onSaved(); }
    catch (e) { setMsg({ tone: "error", text: e instanceof Error ? e.message : "Could not save" }); }
    finally { setBusy(false); }
  }

  return (
    <Card title="Global profit margin" description="Added on top of the real AI cost of every generation. A model with its own margin (below) ignores this.">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Margin for all models" className="w-40">
          <div className="flex items-center gap-2"><input className={inputClass} type="number" min={0} step={0.5} value={pct} onChange={(e) => setPct(e.target.value)} /><span className="text-white/60">%</span></div>
        </Field>
        <Button tone="primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Apply to all models"}</Button>
        {exampleSell != null && <p className="pb-2 text-[13px] text-white/55">Example: ₹100 of AI cost is charged as {rupees(exampleSell)} = {Math.round(exampleSell / inrPerCreditPaise).toLocaleString()} credits (at {paise(inrPerCreditPaise)} per credit).</p>}
      </div>
      {msg && <div className="mt-3"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
    </Card>
  );
}

/** Form for registering a new AI model with a flat cost per generation. */
function AddModelForm({ token, onAdded, onCancel }: { token: string; onAdded: () => void; onCancel: () => void }) {
  const [provider, setProvider] = useState("");
  const [operation, setOperation] = useState<Operation>("TEXT");
  const [model, setModel] = useState("");
  const [inr, setInr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const inrPaise = Math.round(Number(inr) * 100);
    if (!provider.trim()) { setError("Choose or type the AI company."); return; }
    if (!model.trim()) { setError("Type the exact model name from the AI company."); return; }
    if (!Number.isInteger(inrPaise) || inrPaise <= 0) { setError("Enter your average cost for one generation, in rupees."); return; }
    setBusy(true); setError(null);
    // Credits are left out so the server derives a break-even fallback from the ₹-per-credit setting.
    try { await createCreditRate({ provider: provider.trim().toLowerCase(), operation, model: model.trim(), inrCostPaise: inrPaise }, token); onAdded(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not add the model"); setBusy(false); }
  }

  return (
    <div className="mb-4 rounded-xl border border-[#2f7d5b]/40 bg-[#2f7d5b]/[0.06] p-4">
      <h3 className="mb-3 text-[14px] font-semibold text-white">Add an AI model</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="AI company" hint="Pick from the list or type a new one.">
          <input className={inputClass} list="known-providers" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="anthropic" autoFocus />
          <datalist id="known-providers">{KNOWN_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</datalist>
        </Field>
        <Field label="Used for"><select className={inputClass} value={operation} onChange={(e) => setOperation(e.target.value as Operation)}>{OPERATIONS.map((o) => <option key={o} value={o} className="bg-[#14171a]">{OPERATION_LABEL[o]}</option>)}</select></Field>
        <Field label="Exact model name" hint="Copy it from the AI company, e.g. claude-opus-5-5."><input className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} placeholder="claude-opus-5-5" /></Field>
        <Field label="Your cost per generation (₹)" hint="Average real cost of one run."><input className={inputClass} type="number" min={0} step={0.01} value={inr} onChange={(e) => setInr(e.target.value)} placeholder="5.00" /></Field>
      </div>
      <p className="mt-3 text-[12px] leading-5 text-white/45">The model is charged at this cost plus the global margin. To appear in the Creator Lab model menu it also needs to be added there by the technical team, and a new AI company needs its account connected.</p>
      {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      <div className="mt-4 flex gap-2">
        <Button tone="primary" onClick={() => void add()} disabled={busy}>{busy ? "Adding…" : "Add model"}</Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function AiCostsPanel({ token }: { token: string }) {
  const { data, error, loading, reload } = useAsync((tok) => adminCreditRates(tok), token);
  const [adding, setAdding] = useState(false);
  const groups = OPERATIONS.map((op) => ({ op, rates: (data?.items ?? []).filter((r: CreditRate) => r.operation === op) }));
  return (
    <div className="space-y-6">
      {data && <GlobalMarginCard key={data.marginBpsDefault} token={token} defaultMarginBps={data.marginBpsDefault} inrPerCreditPaise={data.inrPerCreditPaise} onSaved={reload} />}
      <Card title="AI models" description="Users pay the real usage (words, picture size or video seconds) at the provider's price, plus your margin. “Typical run” shows a 1,000 + 1,000-token text, a 1-megapixel image or a 5-second video."
        actions={!adding && <Button tone="primary" onClick={() => setAdding(true)}><Plus className="size-4" />Add model</Button>}>
        {adding && <AddModelForm token={token} onCancel={() => setAdding(false)} onAdded={() => { setAdding(false); reload(); }} />}
        {loading ? <Loading /> : error ? <ErrorLine text={error} /> : (
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full border-collapse">
              <thead className="bg-white/[0.03]"><tr><th className={th}>Model</th><th className={th}>Provider&apos;s price</th><th className={th}>Your margin</th><th className={th}>Typical run<br /><span className="font-normal normal-case tracking-normal">your cost → user pays</span></th><th className={th}>Available</th></tr></thead>
              {groups.map(({ op, rates }) => rates.length > 0 && (
                <tbody key={op}><tr className="border-t border-white/8 bg-white/[0.03]"><th colSpan={5} scope="colgroup" className="px-3 py-2 text-left text-[12px] font-semibold text-[#9fd8bd]">{OPERATION_LABEL[op]}</th></tr>{rates.map((r: CreditRate) => <RateRow key={r.id} rate={r} token={token} defaultMarginBps={data?.marginBpsDefault ?? 0} onChanged={reload} />)}</tbody>
              ))}
            </table>
            {data && data.items.length === 0 && <EmptyState>No AI models yet. Select Add model.</EmptyState>}
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Credit history

const KINDS: Array<CreditTxnKind | "ALL"> = ["ALL", "PURCHASE", "USAGE", "REFUND", "GRANT"];
const KIND_LABEL: Record<CreditTxnKind, string> = { PURCHASE: "Bought", USAGE: "Used", REFUND: "Refunded", GRANT: "Given free" };
const KIND_TONE: Record<CreditTxnKind, "good" | "neutral" | "warn" | "info"> = { PURCHASE: "good", USAGE: "neutral", REFUND: "warn", GRANT: "info" };

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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Segmented label="Kind" value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: k === "ALL" ? "All" : KIND_LABEL[k] }))} />
        <Field label="From" className="w-40"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} /></Field>
        <Field label="To" className="w-40"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} /></Field>
        <Field label="Email (this page)" className="w-60"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={inputClass} /></Field>
      </div>
      {loading ? <Loading /> : error ? <ErrorLine text={error} /> : (
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse">
            <thead className="bg-white/[0.03]"><tr><th className={th}>When</th><th className={th}>What</th><th className={th}>User</th><th className={th}>AI model</th><th className={th}>Credits</th><th className={th}>Money paid</th><th className={th}>AI cost</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className={`${td} text-white/60`}>{new Date(r.occurredAt).toLocaleString()}</td>
                <td className={td}><Badge tone={KIND_TONE[r.kind]}>{KIND_LABEL[r.kind]}</Badge></td>
                <td className={td}>{r.user?.email ?? "—"}</td>
                <td className={td}>{r.model ? `${r.provider}/${r.model}` : "—"}</td>
                <td className={`${td} font-medium ${r.credits < 0 ? "text-[#ff8f8f]" : "text-[#9fe0bd]"}`}>{r.credits > 0 ? `+${credits(r.credits)}` : credits(r.credits)}</td>
                <td className={td}>{r.cashPaise !== null ? rupees(r.cashPaise) : "—"}</td>
                <td className={td}>{r.costPaise !== null ? rupees(r.costPaise) : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
          {rows.length === 0 && <EmptyState>No credit movements for these filters.</EmptyState>}
        </div>
      )}
      {data && data.totalPages > 1 && (
        <div className="mt-3 flex items-center gap-3 text-[13px] text-white/60">
          <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span>Page {page} of {data.totalPages} · {data.total} in total</span>
          <Button size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Pricing settings

/** One editable platform setting. Numbers store either rupees (paise x100) or raw; `rounding` is a select. */
function SettingField({ settingKey, label, hint, value, token, kind, options, onSaved }: {
  settingKey: string; label: string; hint?: string; value: unknown; token: string;
  kind: "rupees" | "int" | "float" | "select"; options?: { value: string; label: string }[]; onSaved: () => void;
}) {
  const initial = kind === "rupees" ? ((typeof value === "number" ? value : 0) / 100).toFixed(2) : String(value ?? (kind === "select" ? options?.[0]?.value : 0));
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local input when the stored value loads/changes
  useEffect(() => { setVal(initial); }, [initial]);
  const dirty = val !== initial;
  async function save() {
    setErr(null);
    let payload: number | string;
    if (kind === "select") payload = val;
    else if (kind === "rupees") payload = Math.round(Number(val) * 100);
    else payload = kind === "int" ? Math.round(Number(val)) : Number(val);
    if (kind !== "select" && (!Number.isFinite(payload as number) || (payload as number) < 0)) { setErr("Enter a number of 0 or more"); return; }
    setSaving(true);
    try { await updateSetting(settingKey, payload, token); setSaved(true); setTimeout(() => setSaved(false), 1800); onSaved(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSaving(false); }
  }
  return (
    <div className="grid items-end gap-2 sm:grid-cols-[1fr_auto]">
      <Field label={label} hint={err ? <span className="text-[#ff8f8f]">{err}</span> : hint}>
        {kind === "select"
          ? <select className={inputClass} value={val} onChange={(e) => setVal(e.target.value)}>{options?.map((o) => <option key={o.value} value={o.value} className="bg-[#14171a]">{o.label}</option>)}</select>
          : <div className="flex items-center gap-2">{kind === "rupees" && <span className="text-white/50">₹</span>}<input className={inputClass} type="number" min={0} step={kind === "rupees" || kind === "float" ? 0.01 : 1} value={val} onChange={(e) => setVal(e.target.value)} /></div>}
      </Field>
      <div className={`flex items-center gap-2 ${hint || err ? "sm:mb-5" : ""}`}>
        <Button tone={dirty ? "primary" : "secondary"} onClick={() => void save()} disabled={saving || !dirty}>{saving ? "Saving…" : "Save"}</Button>
        {saved && <span className="text-[12px] text-[#9fe0bd]">Saved</span>}
      </div>
    </div>
  );
}

/** Credits for a no-fixed-price episode of `minutes`, mirroring the server rule (rounded, then clamped). */
function exampleEpisodeCredits(minutes: number, perMinute: number, rounding: string, min: number, max: number) {
  const raw = minutes * perMinute;
  const rounded = rounding === "floor" ? Math.floor(raw) : rounding === "round" ? Math.round(raw) : Math.ceil(raw);
  const clamped = Math.max(min, rounded);
  return max > 0 ? Math.min(max, clamped) : clamped;
}

function PricingPanel({ token }: { token: string }) {
  const { data, error, loading, reload } = useAsync((tok) => adminSettings(tok), token);
  if (loading) return <Loading />;
  if (error) return <ErrorLine text={error} />;
  const get = (k: string) => data?.items.find((s) => s.key === k)?.value;
  const num = (k: string, d: number) => { const v = get(k); return typeof v === "number" ? v : d; };
  const creatorPerCredit = num("creator.credit.inrPerCreditPaise", 100);
  const perMinute = num("viewer.pricing.coinsPerMinute", 1);
  const rounding = typeof get("viewer.pricing.rounding") === "string" ? String(get("viewer.pricing.rounding")) : "ceil";
  const episodeCredits = exampleEpisodeCredits(12.5, perMinute, rounding, num("viewer.pricing.minCoins", 1), num("viewer.pricing.maxCoins", 0));
  const inrPerEpisodeCredit = num("viewer.wallet.inrPerCoinPaise", 100);
  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <Card title="Creator Lab credit value" description="How many rupees one Creator Lab credit is worth. Every AI charge is turned into credits at this value.">
        <SettingField settingKey="creator.credit.inrPerCreditPaise" label="Rupees per Creator Lab credit" value={creatorPerCredit} token={token} kind="rupees" onSaved={reload} hint={`Now: a generation costing ₹55 is charged ${Math.round(5500 / creatorPerCredit)} credits (before margin).`} />
      </Card>
      <Card title="Episode credit value (India)" description="What one episode credit is worth in rupees. Viewers in India, and every country other than the US and UAE, pay this.">
        <SettingField settingKey="viewer.wallet.inrPerCoinPaise" label="Rupees per episode credit" value={inrPerEpisodeCredit} token={token} kind="rupees" onSaved={reload} hint={`Now: a 5-credit episode costs ${rupees(5 * inrPerEpisodeCredit)}.`} />
      </Card>
      <Card title="Automatic episode prices" description="Used only for paid episodes that have no fixed price in All content → Edit." className="lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingField settingKey="viewer.pricing.coinsPerMinute" label="Credits per minute of video" value={get("viewer.pricing.coinsPerMinute") ?? 1} token={token} kind="float" onSaved={reload} />
          <SettingField settingKey="viewer.pricing.rounding" label="Part-minutes are rounded" value={get("viewer.pricing.rounding") ?? "ceil"} token={token} kind="select" onSaved={reload} options={[{ value: "ceil", label: "Up (ceil)" }, { value: "round", label: "To the nearest (round)" }, { value: "floor", label: "Down (floor)" }]} />
          <SettingField settingKey="viewer.pricing.minCoins" label="Lowest price for a paid episode (credits)" value={get("viewer.pricing.minCoins") ?? 1} token={token} kind="int" onSaved={reload} />
          <SettingField settingKey="viewer.pricing.maxCoins" label="Highest price for an episode (credits)" hint="0 means no limit." value={get("viewer.pricing.maxCoins") ?? 0} token={token} kind="int" onSaved={reload} />
        </div>
        <p className="mt-4 text-[13px] text-[#a9e8c6]">With these rules, a 12.5-minute episode costs {episodeCredits} credits ({rupees(episodeCredits * inrPerEpisodeCredit)} in India).</p>
      </Card>
      <div className="lg:col-span-2">
        <RegionalCreditRates token={token} rates={(get("viewer.credit.regionRates") ?? {}) as Record<string, { currency: string; amountMinor: number }>} onSaved={reload} />
      </div>
    </div>
  );
}

function RegionalCreditRates({ token, rates, onSaved }: { token: string; rates: Record<string, { currency: string; amountMinor: number }>; onSaved: () => void }) {
  const [us, setUs] = useState(rates.US ? (rates.US.amountMinor / 100).toFixed(2) : "");
  const [ae, setAe] = useState(rates.AE ? (rates.AE.amountMinor / 100).toFixed(2) : "");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  async function save() {
    const next = { ...rates };
    for (const [country, currency, raw] of [["US", "USD", us], ["AE", "AED", ae]]) {
      if (!raw.trim()) { delete next[country]; continue; }
      const amountMinor = Math.round(Number(raw) * 100);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) { setMsg({ tone: "error", text: "Enter a positive amount, or leave a country empty for automatic conversion." }); return; }
      next[country] = { currency, amountMinor };
    }
    setSaving(true); setMsg(null);
    try { await updateSetting("viewer.credit.regionRates", next, token); setMsg({ tone: "success", text: "Country prices saved." }); onSaved(); }
    catch (e) { setMsg({ tone: "error", text: e instanceof Error ? e.message : "Could not save rates" }); }
    finally { setSaving(false); }
  }
  const usExample = us.trim() && Number(us) > 0 ? `$${(Number(us) * 5).toFixed(2)}` : "about $0.06 (converted daily)";
  return (
    <Card title="Episode credit value (US and UAE)" description="Set what one episode credit costs in dollars and dirhams. Leave a box empty to convert from the rupee price automatically each day. A price set on a single episode always wins.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="United States: $ per credit" hint={`A 5-credit episode costs ${usExample}.`}><input className={inputClass} type="number" min="0.01" step="0.01" placeholder="Automatic conversion" value={us} onChange={(e) => setUs(e.target.value)} /></Field>
        <Field label="UAE: AED per credit" hint="Empty = automatic conversion."><input className={inputClass} type="number" min="0.01" step="0.01" placeholder="Automatic conversion" value={ae} onChange={(e) => setAe(e.target.value)} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button tone="primary" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save country prices"}</Button>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Layout

export default function AdminDashboard() {
  const { user, accessToken, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  // Keep the open page in the address (/admin#packs) so refresh and shared links land on the same page.
  useEffect(() => {
    const sync = () => { const h = window.location.hash.slice(1); if (isTab(h)) setTab(h); };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  function go(next: Tab) {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0 });
  }

  const current = ITEMS.find((i) => i.id === tab) ?? ITEMS[0];
  const headerActions = tab === "content" ? <><Button onClick={() => go("add-youtube")}><SquarePlay className="size-4" />Add from YouTube</Button><Button onClick={() => go("add-cloudflare")}><CloudUpload className="size-4" />Upload video</Button></> : undefined;

  return (
    <div className="min-h-screen bg-[#0b0c0d] text-white">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-white/8 bg-[#0b0c0d]/95 px-4 py-3 backdrop-blur sm:px-6">
        <span className="text-[17px] font-bold tracking-[-0.4px]">RVNextGEN <span className="font-medium text-[#9fd8bd]">Admin</span></span>
        <span className="hidden truncate text-[13px] text-white/40 sm:inline">{user?.email}</span>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-[13px] text-white/75 hover:bg-white/5" aria-label="Back to app"><ArrowLeft className="size-4" /><span className="hidden sm:inline">Back to app</span></Link>
          <button onClick={() => void signOut()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/12 px-3 text-[13px] text-white/75 hover:bg-white/5" aria-label="Log out"><LogOut className="size-4" /><span className="hidden sm:inline">Log out</span></button>
        </div>
      </header>

      <div className="lg:flex">
        <nav aria-label="Admin sections" className="hidden min-h-[calc(100vh-61px)] w-60 shrink-0 border-r border-white/8 px-3 py-5 lg:block">
          <div className="sticky top-20 space-y-5">
            {NAV.map((g) => (
              <div key={g.group}>
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/30">{g.group}</p>
                <ul className="space-y-0.5">
                  {g.items.map((i) => {
                    const Icon = i.icon;
                    const active = i.id === tab;
                    return (
                      <li key={i.id}>
                        <button type="button" onClick={() => go(i.id)} aria-current={active ? "page" : undefined}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] transition-colors ${active ? "bg-white/10 font-medium text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                          <Icon className={`size-4 ${active ? "text-[#9fd8bd]" : ""}`} />{i.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-b border-white/8 px-4 py-3 lg:hidden">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/35">Section</span>
            <select value={tab} onChange={(e) => go(e.target.value as Tab)} className={inputClass} aria-label="Admin section">
              {NAV.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map((i) => <option key={i.id} value={i.id} className="bg-[#14171a]">{i.label}</option>)}</optgroup>)}
            </select>
          </label>
        </div>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
          <PageHeader title={current.title} description={current.description} actions={headerActions} />
          {!accessToken ? <Loading /> : tab === "dashboard" ? <AnalyticsPanel token={accessToken} />
            : tab === "users" ? <UsersPanel token={accessToken} />
            : tab === "content" ? <ContentPanel token={accessToken} />
            : tab === "genres" ? <GenresPanel token={accessToken} />
            : tab === "ai-costs" ? <AiCostsPanel token={accessToken} />
            : tab === "transactions" ? <TransactionsPanel token={accessToken} />
            : tab === "packs" ? <PacksPanel token={accessToken} />
            : tab === "pricing" ? <PricingPanel token={accessToken} />
            : tab === "add-youtube" ? <AddVideo />
            : <CloudflareUpload />}
        </main>
      </div>
    </div>
  );
}
