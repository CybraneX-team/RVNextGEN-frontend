"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, AudioLines, ChevronRight, CircleUserRound, FolderOpen, Home, LayoutTemplate, MessageSquareText, Plus, Shapes, Sparkles, SquareArrowRightExit, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { listProjects, type Project } from "@/lib/creator";

export type CreatorSection = "home" | "templates" | "videos" | "archive" | "library" | "brand-kits" | "avatars" | "voices";

const primary: { id: CreatorSection; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "videos", label: "Videos", icon: Video },
  { id: "archive", label: "Archive", icon: Archive },
];
const assets: { id: CreatorSection; label: string; icon: LucideIcon }[] = [
  { id: "library", label: "Library", icon: FolderOpen },
  { id: "brand-kits", label: "Brand Kits", icon: Shapes },
  { id: "avatars", label: "Avatars", icon: CircleUserRound },
  { id: "voices", label: "Voices", icon: AudioLines },
];

export default function CreatorSidebar({ activeSection, currentProject }: { activeSection: CreatorSection | null; currentProject?: Pick<Project, "id" | "title"> | null }) {
  const { accessToken } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    async function load() {
      const first = await listProjects(accessToken!, 1, 50);
      const all = [...first.items];
      if (live) { setProjects([...all]); setLoadError(false); }
      for (let page = 2; page <= first.totalPages; page += 4) {
        const pages = await Promise.all(Array.from({ length: Math.min(4, first.totalPages - page + 1) }, (_, index) => listProjects(accessToken!, page + index, 50)));
        all.push(...pages.flatMap((result) => result.items));
      }
      return all;
    }
    load().then((result) => { if (live) { setProjects(result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); setLoadError(false); } })
      .catch(() => { if (live) setLoadError(true); });
    return () => { live = false; };
  }, [accessToken, loadAttempt]);

  const visibleProjects = (projects ?? []).filter((project) => project.status.toUpperCase() !== "ARCHIVED");
  if (currentProject && !visibleProjects.some((project) => project.id === currentProject.id)) visibleProjects.unshift({ ...currentProject, status: "ACTIVE", createdAt: "", updatedAt: "" });
  const item = ({ id, label, icon: Icon }: (typeof primary)[number]) => {
    const active = activeSection === id;
    return <Link key={id} href={id === "home" ? "/creator" : `/creator/${id}`} aria-current={active ? "page" : undefined} className={`flex h-[34px] items-center gap-3 rounded-[11px] px-3 text-[12px] transition-colors ${active ? "bg-[#2a2a2c] font-medium text-white" : "text-white/50 hover:bg-white/[.06] hover:text-white/90"}`}><Icon className="size-[15px] shrink-0" />{label}</Link>;
  };

  return <nav aria-label="Creator Lab navigation" className="fixed inset-y-4 left-4 z-40 hidden w-[218px] flex-col overflow-hidden rounded-[23px] border border-white/[.08] bg-[#171718] p-[10px] shadow-[0_16px_44px_#0006] lg:flex">
    <div className="flex h-[54px] shrink-0 items-center gap-2.5 rounded-[16px] bg-[#1d1d1f] px-2.5">
      <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold leading-4 text-white/95">Workspace</span><span className="block text-[10px] leading-4 text-white/40">Creator Lab</span></span>
      <Link href="/" aria-label="Back to app" title="Back to app" className="grid size-7 shrink-0 place-items-center rounded-lg text-white/35 transition-colors hover:bg-white/[.07] hover:text-white"><SquareArrowRightExit className="size-3.5" /></Link>
    </div>
    <div className="mt-5 space-y-0.5">{primary.map(item)}</div>
    <p className="mb-1 mt-5 px-3 text-[10px] font-medium text-white/50">Assets</p>
    <div className="space-y-0.5">{assets.map(item)}</div>
    <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-white/[.08] pt-3">
      <Link href="/creator#new-project" className="mb-3 flex h-[34px] shrink-0 items-center gap-2.5 rounded-[10px] px-3 text-[12px] font-medium text-white/80 transition-colors hover:bg-white/[.07] hover:text-white"><Plus className="size-[15px]" />New project</Link>
      <p className="mb-2 px-3 text-[10px] font-medium text-white/50">Chats</p>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain [scrollbar-color:#ffffff26_transparent] [scrollbar-width:thin]">
        {visibleProjects.map((project) => <Link key={project.id} href={`/creator/${project.id}`} title={project.title} aria-current={currentProject?.id === project.id ? "page" : undefined} className={`flex min-h-[34px] items-center gap-2.5 rounded-[10px] px-3 text-[12px] transition-colors ${currentProject?.id === project.id ? "bg-[#2a2a2c] font-medium text-white" : "text-white/55 hover:bg-white/[.06] hover:text-white/90"}`}><MessageSquareText className="size-[14px] shrink-0 text-white/40" /><span className="truncate">{project.title}</span></Link>)}
        {!projects && !loadError && !currentProject && <p className="px-3 py-2 text-[11px] text-white/35">Loading chats…</p>}
        {projects && visibleProjects.length === 0 && <p className="px-3 py-2 text-[11px] leading-4 text-white/35">Your projects will appear here.</p>}
        {loadError && <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="px-3 py-2 text-left text-[11px] text-white/55 hover:text-white">Couldn’t load {visibleProjects.length ? "all chats" : "chats"}. Retry</button>}
      </div>
    </div>
    <Link href="/wallet" className="mt-auto flex h-[38px] shrink-0 items-center gap-2 rounded-full border border-white/[.08] bg-[#0b0b0c] px-3 text-[11px] font-medium text-white/85 transition-colors hover:border-white/20 hover:bg-[#202022]"><Sparkles className="size-[15px] text-[#fa5b2d]" /><span className="flex-1 truncate">Unlock more features</span><ChevronRight className="size-3 text-white/35" /></Link>
  </nav>;
}
