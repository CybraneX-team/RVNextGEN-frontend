"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Clapperboard, FolderOpen, Home, LoaderCircle, Plus, Sparkles } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { createProject, getCreditBalance, listProjects, type Project } from "@/lib/creator";

export default function CreatorApp() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    listProjects(accessToken).then((result) => {
      if (live) { setProjects(result.items); setError(null); }
    }).catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "Could not load projects."); });
    getCreditBalance(accessToken).then((credits) => { if (live) setBalance(credits.balance); }).catch(() => { if (live) setBalance(null); });
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create project."); setCreating(false); }
  }

  return <div className="creator-workspace min-h-dvh bg-[#0e0e10] text-white">
    <nav aria-label="Creator Lab navigation" className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-white/[.07] bg-[#101012] px-3 lg:inset-y-0 lg:right-auto lg:h-auto lg:w-[60px] lg:flex-col lg:justify-start lg:gap-4 lg:border-r lg:border-t-0 lg:px-0 lg:pt-4">
      <Link href="/creator" aria-label="Your projects" title="Your projects" className="grid size-9 place-items-center rounded-lg bg-white/[.07] text-white"><FolderOpen className="size-[17px]" /></Link>
      <Link href="/" aria-label="Back to app" title="Back to app" className="grid size-9 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/[.06] hover:text-white"><Home className="size-[17px]" /></Link>
      <span aria-hidden="true" className="grid size-9 place-items-center text-white/25"><Clapperboard className="size-[17px]" /></span>
    </nav>

    <main className="mx-auto min-h-dvh max-w-[1700px] pb-20 lg:pl-[60px] lg:pb-0">
      <header className="flex h-14 items-center justify-between gap-3 border-b border-white/[.055] px-4 sm:px-6 lg:h-[62px]">
        <div className="flex min-w-0 items-center gap-3"><Clapperboard className="size-[17px] text-white/55" /><div><p className="text-[13px] font-medium text-white/80">Creator Lab</p><p className="text-[10px] text-white/35">Your creative workspace</p></div></div>
        <span className="rounded-full border border-white/[.08] px-2.5 py-1 text-[10px] text-white/55">{balance == null ? "…" : `${balance} credits`}</span>
      </header>

      <div className="px-4 pb-8 pt-6 sm:px-6 lg:pt-9">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] tracking-[.12em] text-white/35">WORKSPACE</p><h1 className="mt-1 text-[24px] font-semibold tracking-[-.6px] sm:text-[28px]">Your projects</h1></div><span className="text-[12px] text-white/35">{projects ? `${projects.length} ${projects.length === 1 ? "project" : "projects"}` : "Loading…"}</span></div>
        {error && <div role="alert" className="mb-4 rounded-lg border border-red-300/20 bg-red-300/[.04] px-3 py-2 text-[12px] text-red-200">{error}<button type="button" onClick={() => { setError(null); setLoadAttempt((value) => value + 1); }} className="ml-2 underline">Retry</button></div>}
        {projects == null ? <div className="grid min-h-[150px] place-items-center rounded-[12px] border border-white/[.06] bg-[#171719] text-[12px] text-white/35">Loading projects…</div>
          : projects.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{projects.map((project) => <button key={project.id} type="button" onClick={() => router.push(`/creator/${project.id}`)} className="group flex min-h-[116px] flex-col justify-between rounded-[10px] border border-white/[.055] bg-[#171719] p-4 text-left transition-[border-color,background-color] hover:border-white/[.18] hover:bg-[#1c1c1f]"><span className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-[13px] font-medium text-white/80">{project.title}</span><ArrowRight className="size-4 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/65" /></span><span className="flex items-center justify-between gap-2 text-[10px] text-white/35"><span>{project.status.toLowerCase().replaceAll("_", " ")}</span><span>{new Date(project.updatedAt).toLocaleDateString()}</span></span></button>)}</div>
          : <div className="grid min-h-[145px] place-items-center rounded-[12px] border border-dashed border-white/[.09] bg-[#151517] px-5 text-center"><div><Sparkles className="mx-auto mb-2 size-5 text-white/40" /><p className="text-[13px] text-white/65">A blank canvas for your first story</p><p className="mt-1 text-[11px] text-white/35">Start a project below to build your film.</p></div></div>}

        <section aria-label="Create a project" className="mx-auto mt-10 w-full max-w-[690px] rounded-[14px] border border-white/[.08] bg-[#171719] p-3 shadow-[0_20px_60px_#0005] sm:mt-16 sm:p-4 lg:mt-[clamp(64px,12vh,160px)]">
          <label htmlFor="creator-project-title" className="mb-2 block px-1 text-[11px] text-white/55">Begin a new project</label>
          <input id="creator-project-title" value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void create(); }} maxLength={300} placeholder="Give your story a title…" className="h-14 w-full bg-transparent px-1 text-[13px] text-white/85 outline-none placeholder:text-white/30" />
          <div className="flex items-center justify-between pt-2"><Plus aria-hidden="true" className="ml-1 size-4 text-white/35" /><button type="button" onClick={() => void create()} disabled={creating} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-[11px] font-semibold text-[#111114] transition-opacity hover:opacity-85 disabled:opacity-40">{creating ? <LoaderCircle className="size-3 animate-spin" /> : <Sparkles className="size-3" />}{creating ? "Creating…" : "Create project"}</button></div>
        </section>
      </div>
    </main>
  </div>;
}
