"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import { createProject, listProjects, type Project } from "@/lib/creator";
import CreatorHeader from "./CreatorHeader";

function StatusPill({ status }: { status: string }) {
  const label = status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const ready = status === "PUBLISHED" || status === "COMPLETE" || status === "READY";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] ${ready ? "border-[#e5b27f]/20 bg-[#e5b27f]/[.06] text-[#e7bd94]" : "border-white/10 bg-white/[0.03] text-white/50"}`}><span className={`size-1.5 rounded-full ${ready ? "bg-[#e5b27f]" : "bg-white/35"}`} />{label}</span>;
}

export default function CreatorApp() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    listProjects(accessToken).then((r) => { if (live) setProjects(r.items); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load projects"); });
    return () => { live = false; };
  }, [accessToken, loadAttempt]);

  async function create() {
    if (!accessToken || creating) return;
    const name = title.trim();
    if (!name) { setError("Give your project a title."); return; }
    setCreating(true); setError(null);
    try {
      const project = await createProject(name, accessToken);
      router.push(`/creator/${project.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project");
      setCreating(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#0e0d0f] text-white">
      <CreatorHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <section className="relative isolate mb-7 overflow-hidden rounded-[26px] border border-[#d9a26d]/15 bg-[radial-gradient(ellipse_at_top_right,rgba(167,91,47,.22),transparent_55%),linear-gradient(135deg,#211710,#151313_68%)] p-5 shadow-[0_24px_80px_#0005] sm:mb-9 sm:p-8 md:p-10">
          <div className="pointer-events-none absolute -right-12 -top-24 -z-10 size-64 rounded-full bg-[#d98a4d]/10 blur-3xl" />
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#e5b27f]/20 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.2em] text-[#e7bd94] sm:text-[11px]">
            <span className="size-1.5 rounded-full bg-[#e5a66c]" /> RVNextGen Creator Lab
          </div>
          <h1 className="max-w-2xl text-[30px] leading-[1.08] font-semibold tracking-[-1.2px] sm:text-[42px] md:text-[48px]">Bring your next story <span className="font-serif font-normal italic text-[#e9b482]">to life.</span></h1>
          <p className="mt-3 max-w-xl text-[14px] leading-6 text-white/60 sm:text-[16px]">Shape an idea into a film, one creative step at a time.</p>
        </section>

        <section className="mb-8 rounded-[20px] border border-white/[0.09] bg-[#171517] p-4 sm:mb-10 sm:flex sm:items-center sm:gap-4 sm:p-5">
          <div className="mb-3 min-w-0 sm:mb-0 sm:flex-1">
            <h2 className="text-[15px] font-semibold tracking-[-.2px]">Start with an idea</h2>
            <p className="mt-1 text-[12px] leading-5 text-white/45">Give your new project a working title.</p>
          </div>
          <div className="flex min-w-0 flex-col gap-2.5 sm:w-[min(100%,500px)] sm:flex-row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void create(); }}
            placeholder="New project title…"
            maxLength={300}
            className="h-12 min-w-0 shrink-0 rounded-xl border border-white/10 bg-black/20 px-4 text-[14px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#d99c69]/60 focus:bg-black/30 sm:flex-1"
          />
          <button onClick={create} disabled={creating} className="h-12 shrink-0 rounded-xl bg-[#e5b27f] px-5 text-[13px] font-semibold text-[#20140c] transition-colors hover:bg-[#f0c493] disabled:cursor-wait disabled:opacity-50 sm:px-6">{creating ? "Creating…" : "Create project"}</button>
          </div>
        </section>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-300/15 bg-red-300/[.06] px-4 py-3 text-[13px] text-[#ff9b9b]">{error}</p>}

        {projects == null && error ? (
          <div className="rounded-[20px] border border-red-300/15 bg-red-300/[.04] px-5 py-8 text-center sm:py-10"><p className="text-[14px] font-medium text-white/85">Couldn’t load your projects</p><p className="mt-2 text-[12px] text-white/45">Check your connection, then try again.</p><button type="button" onClick={() => { setError(null); setLoadAttempt((attempt) => attempt + 1); }} className="mt-4 rounded-xl border border-white/12 px-4 py-2 text-[12px] font-medium text-white/75 transition-colors hover:bg-white/[.05]">Try again</button></div>
        ) : projects == null ? (
          <div className="grid gap-3 sm:grid-cols-2"><div className="h-28 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.025]" /><div className="hidden h-28 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.025] sm:block" /></div>
        ) : projects.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-white/12 px-5 py-10 text-center sm:py-14">
            <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-[#e5b27f]/20 bg-[#e5b27f]/[.07] text-[#e5b27f]"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 4v16M4 12h16" /></svg></span>
            <h2 className="text-[16px] font-semibold">Your studio is ready</h2><p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-white/45">Create your first project above and start turning a spark into a story.</p>
          </div>
        ) : (
          <section>
          <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#d7a574]/70">Your workspace</p><h2 className="mt-1 text-[20px] font-semibold tracking-[-.4px] sm:text-[22px]">Your projects</h2></div><span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[11px] text-white/45">{projects.length} {projects.length === 1 ? "project" : "projects"}</span></div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:gap-4">
            {projects.map((p) => (
              <li key={p.id}>
                <button onClick={() => router.push(`/creator/${p.id}`)} className="group flex min-h-32 w-full flex-col justify-between rounded-[18px] border border-white/[.08] bg-[#171517] p-4 text-left transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-[#e5b27f]/30 hover:bg-[#1d1917] active:translate-y-0 sm:min-h-36 sm:p-5">
                  <span className="flex items-start justify-between gap-3"><span className="line-clamp-2 text-[15px] font-semibold leading-5 text-white sm:text-[16px]">{p.title}</span><svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-[#e5b27f]" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></span>
                  <span className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2"><StatusPill status={p.status} /><span className="text-[11px] text-white/40">Updated {new Date(p.updatedAt).toLocaleDateString()}</span></span>
                </button>
              </li>
            ))}
          </ul>
          </section>
        )}
      </main>
    </div>
  );
}
