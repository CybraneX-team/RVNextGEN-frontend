"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clapperboard, Coins, FolderOpen, Home, LoaderCircle, Plus, Search, Sparkles } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { createProject, getCreditBalance, listProjects, type Project } from "@/lib/creator";
import CreatorSidebar from "./CreatorSidebar";

const IDEAS = [
  { title: "A story beyond the horizon", eyebrow: "WORLD BUILDING", image: "/images/distant-desert.png", alt: "Golden sun over a desert landscape" },
  { title: "Somewhere new", eyebrow: "SCENE MAKING", image: "/images/image.png", alt: "Rolling hills beneath a blue sky" },
  { title: "The city after dark", eyebrow: "CINEMATIC STORY", image: "/art/city.svg", alt: "Illustrated city at night" },
];

export default function CreatorApp() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const projectsRef = useRef<HTMLElement>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
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

  function focusCreate(nextTitle?: string) {
    if (nextTitle) setTitle(nextTitle);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    titleRef.current?.focus({ preventScroll: true });
  }

  async function create() {
    if (!accessToken || creating) return;
    const name = title.trim();
    if (!name) { setError("Give your project a title."); focusCreate(); return; }
    setCreating(true); setError(null);
    try {
      const project = await createProject(name, accessToken);
      router.push(`/creator/${project.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create project."); setCreating(false); }
  }

  const filteredProjects = projects?.filter((project) => project.title.toLowerCase().includes(search.trim().toLowerCase())) ?? [];
  const latestProject = projects?.[0];

  return <div className="creator-workspace min-h-dvh bg-[#0b0b0c] text-[#f5f3f1]">
    <CreatorSidebar activeSection="home" />

    <nav aria-label="Creator Lab mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] items-center justify-around border-t border-white/[.1] bg-[#141415]/95 px-4 backdrop-blur-xl lg:hidden">
      <Link href="/creator" aria-current="page" className="flex min-w-16 flex-col items-center gap-1 text-[10px] text-white"><FolderOpen className="size-5" />Projects</Link>
      <button type="button" onClick={() => focusCreate()} className="grid size-11 place-items-center rounded-full bg-[#fa5b2d] text-white" aria-label="Start a project"><Plus className="size-5" /></button>
      <Link href="/" className="flex min-w-16 flex-col items-center gap-1 text-[10px] text-white/55"><Home className="size-5" />App</Link>
    </nav>

    <main className="min-h-dvh pb-24 lg:pl-[250px] lg:pb-12">
      <header className="sticky top-0 z-20 flex min-h-[70px] items-center gap-3 border-b border-white/[.075] bg-[#0b0b0c]/95 px-4 backdrop-blur-xl sm:px-7 lg:px-8">
        <div className="hidden shrink-0 items-center gap-2.5 sm:flex"><Clapperboard className="size-[18px] text-[#ff784e]" /><span className="text-lg font-semibold tracking-[-.02em]">Creator Lab</span></div>
        <div className="ml-auto flex gap-3">
          <label className="flex h-10 w-full max-w-[520px] items-center gap-2.5 rounded-full border border-white/[.12] bg-[#111112] px-4 text-white/40 transition-colors focus-within:border-white/30"><Search className="size-4 shrink-0" /><span className="sr-only">Search projects</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your projects" className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35" /></label>
          <button type="button" onClick={() => focusCreate()} className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#fa5b2d] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#ff7049] sm:inline-flex"><Plus className="size-4" /> New project</button>
          <span className="hidden shrink-0 h-10 rounded-full border border-white/[.09] px-3 py-2 text-sm text-white/50 xl:flex items-center gap-2"><Coins />{balance == null ? "…" : `${(balance / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} credits`}</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-4 pt-7 sm:px-7 lg:px-8 lg:pt-9">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#ff8c68]">Your creative workspace</p><h1 className="mt-1.5 text-[28px] font-semibold tracking-[-.045em] sm:text-[34px]">Make something extraordinary.</h1></div><span className="hidden text-[12px] text-white/35 sm:block">Your next story starts here</span></div>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-300/20 bg-red-300/[.05] px-4 py-3 text-[13px] text-red-200">{error}<button type="button" onClick={() => { setError(null); setLoadAttempt((value) => value + 1); }} className="ml-2 font-semibold underline underline-offset-2">Retry</button></div>}

        <section aria-label="Quick actions" className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          <button type="button" onClick={() => focusCreate()} className="group flex min-h-[76px] items-center gap-3 rounded-[15px] border border-white/[.09] bg-[#151516] p-3 text-left transition-[border-color,background-color] hover:border-[#fa5b2d]/35 hover:bg-[#1c1918]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fa5b2d]/15 text-[#ff835d]"><Plus className="size-[18px]" /></span><span><span className="block text-[13px] font-semibold">New project</span><span className="mt-0.5 block text-[11px] text-white/40">Start with a blank story</span></span><ArrowRight className="ml-auto hidden size-3.5 text-white/30 transition-transform group-hover:translate-x-0.5 sm:block" /></button>
          <button type="button" onClick={() => latestProject ? router.push(`/creator/${latestProject.id}`) : focusCreate()} className="group flex min-h-[76px] items-center gap-3 rounded-[15px] border border-white/[.09] bg-[#151516] p-3 text-left transition-[border-color,background-color] hover:border-white/20 hover:bg-[#1c1c1e]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.06] text-white/70"><Clapperboard className="size-[18px]" /></span><span className="min-w-0"><span className="block truncate text-[13px] font-semibold">Continue creating</span><span className="mt-0.5 block truncate text-[11px] text-white/40">{latestProject ? latestProject.title : "Your next project"}</span></span><ArrowRight className="ml-auto hidden size-3.5 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 sm:block" /></button>
          <button type="button" onClick={() => projectsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="group flex min-h-[76px] items-center gap-3 rounded-[15px] border border-white/[.09] bg-[#151516] p-3 text-left transition-[border-color,background-color] hover:border-white/20 hover:bg-[#1c1c1e]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.06] text-white/70"><FolderOpen className="size-[18px]" /></span><span><span className="block text-[13px] font-semibold">Your projects</span><span className="mt-0.5 block text-[11px] text-white/40">{projects ? `${projects.length} in your workspace` : "All your stories"}</span></span><ArrowRight className="ml-auto hidden size-3.5 text-white/30 transition-transform group-hover:translate-x-0.5 sm:block" /></button>
          <Link href="/" className="group flex min-h-[76px] items-center gap-3 rounded-[15px] border border-white/[.09] bg-[#151516] p-3 text-left transition-[border-color,background-color] hover:border-white/20 hover:bg-[#1c1c1e]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.06] text-white/70"><Home className="size-[18px]" /></span><span><span className="block text-[13px] font-semibold">Explore RVNextGEN</span><span className="mt-0.5 block text-[11px] text-white/40">See stories in the app</span></span><ArrowRight className="ml-auto hidden size-3.5 text-white/30 transition-transform group-hover:translate-x-0.5 sm:block" /></Link>
        </section>

        <section id="new-project" ref={formRef} aria-label="Create a project" className="mt-4 grid scroll-mt-24 overflow-hidden rounded-[22px] border border-white/[.09] bg-[#1d1d1e] lg:grid-cols-[minmax(0,1.04fr)_minmax(0,.96fr)]">
          <div className="relative min-h-[245px] overflow-hidden bg-[#29201e] sm:min-h-[290px] lg:min-h-[340px]"><Image src="/images/distant-desert.png" alt="Sun setting over the desert" fill sizes="(max-width: 1024px) 100vw, 50vw" priority className="object-cover object-center" /><div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" /><div className="absolute bottom-5 left-5 flex items-center gap-2.5 text-[11px] font-medium text-white/85 sm:bottom-7 sm:left-7"><span className="grid size-9 place-items-center rounded-full border border-white/40 bg-black/30 backdrop-blur-sm"><Sparkles className="size-[15px]" /></span> Your next world is waiting</div></div>
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:px-[clamp(28px,4vw,68px)]"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#ff8c68]">A blank canvas for your ideas</p><h2 className="mt-4 max-w-[480px] text-[31px] font-semibold leading-[1.08] tracking-[-.045em] sm:text-[38px]">Create a story only you could tell.</h2><p className="mt-4 max-w-[410px] text-[13px] leading-[1.6] text-white/50 sm:text-[14px]">Give your project a name. We’ll help you build the story, characters, scenes, and film from there.</p>
            <form onSubmit={(event) => { event.preventDefault(); void create(); }} className="mt-7 flex w-full max-w-[480px] flex-col gap-2 sm:flex-row"><label htmlFor="creator-project-title" className="sr-only">Project title</label><input ref={titleRef} id="creator-project-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={300} placeholder="Name your new project" className="h-11 min-w-0 flex-1 rounded-full border border-white/[.16] bg-[#111112] px-4 text-[13px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/45" /><button type="submit" disabled={creating} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#fa5b2d] px-5 text-[12px] font-semibold text-white transition-colors hover:bg-[#ff7049] disabled:cursor-wait disabled:opacity-50">{creating ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}{creating ? "Creating…" : "Create project"}</button></form>
          </div>
        </section>

        <section ref={projectsRef} aria-label="Your projects" className="scroll-mt-24 pt-9 sm:pt-11"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/35">YOUR WORKSPACE</p><h2 className="mt-1 text-[21px] font-semibold tracking-[-.035em] sm:text-[24px]">Your projects</h2></div><span className="text-[12px] text-white/40">{projects ? `${filteredProjects.length} ${filteredProjects.length === 1 ? "project" : "projects"}` : "Loading…"}</span></div>
          {projects == null ? <div className="grid min-h-[160px] place-items-center rounded-[16px] border border-white/[.07] bg-[#151516] text-[13px] text-white/40">Loading projects…</div>
            : filteredProjects.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filteredProjects.map((project, index) => <button key={project.id} type="button" onClick={() => router.push(`/creator/${project.id}`)} className="group overflow-hidden rounded-[17px] border border-white/[.09] bg-[#171718] text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff835d]"><span className={`relative flex h-[142px] items-end overflow-hidden ${index % 3 === 0 ? "bg-[radial-gradient(circle_at_68%_45%,#5b3a2c,#24201e_52%,#171717)]" : index % 3 === 1 ? "bg-[radial-gradient(circle_at_68%_45%,#344d54,#1d292c_52%,#171717)]" : "bg-[radial-gradient(circle_at_68%_45%,#56514c,#292824_52%,#171717)]"}`}><span aria-hidden="true" className="absolute -right-5 -top-20 size-56 rounded-full border border-white/[.08] transition-transform duration-300 group-hover:scale-110" /><span aria-hidden="true" className="absolute right-8 top-8 size-32 rounded-full border border-white/[.1]" /><span className="relative m-4 inline-flex items-center gap-1.5 rounded-full border border-white/[.12] bg-black/25 px-2.5 py-1 text-[10px] text-white/75"><Clapperboard className="size-3" /> Project</span></span><span className="flex min-h-[84px] items-center justify-between gap-3 px-4 py-3.5"><span className="min-w-0"><span className="block truncate text-[14px] font-semibold text-white/85">{project.title}</span><span className="mt-1 block text-[11px] capitalize text-white/40">{project.status.toLowerCase().replaceAll("_", " ")} · Updated {new Date(project.updatedAt).toLocaleDateString()}</span></span><ArrowRight className="size-4 shrink-0 text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-white" /></span></button>)}</div>
              : <div className="grid min-h-[150px] place-items-center rounded-[16px] border border-dashed border-white/[.12] bg-[#151516] px-5 text-center"><div><FolderOpen className="mx-auto mb-2 size-5 text-white/35" /><p className="text-[13px] text-white/65">{search ? "No projects match your search" : "Your first project starts above"}</p><p className="mt-1 text-[11px] text-white/35">{search ? "Try a different title." : "Give your story a name to begin creating."}</p></div></div>}
        </section>

        <section aria-label="Creative inspiration" className="pt-9 sm:pt-11"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/35">A PLACE TO BEGIN</p><h2 className="mt-1 text-[21px] font-semibold tracking-[-.035em] sm:text-[24px]">Get inspired</h2></div><span className="hidden text-[12px] text-white/40 sm:block">Choose an idea to name your next project</span></div><div className="grid gap-3 sm:grid-cols-3">{IDEAS.map((idea) => <button key={idea.title} type="button" onClick={() => focusCreate(idea.title)} className="group relative h-[180px] overflow-hidden rounded-[16px] border border-white/[.09] bg-[#1b1b1d] text-left sm:h-[190px]"><Image src={idea.image} alt={idea.alt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.045]" /><span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" /><span className="absolute inset-x-4 bottom-4"><span className="block text-[9px] font-semibold tracking-[.18em] text-white/65">{idea.eyebrow}</span><span className="mt-1 block text-[17px] font-semibold text-white">{idea.title}</span></span><ArrowRight className="absolute right-4 top-4 size-4 text-white/80 transition-transform group-hover:translate-x-0.5" /></button>)}</div></section>
      </div>
    </main>
  </div>;
}
