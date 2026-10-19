"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Clapperboard, FolderOpen, Home, LoaderCircle, Plus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { createProject, getProject, listProjects, type Project, type ProjectDetail } from "@/lib/creator";
import CreatorSidebar, { type CreatorSection } from "./CreatorSidebar";

type Section = Exclude<CreatorSection, "home">;
type Media = { id: string; title: string; projectId: string; url: string; kind: "video" | "image" };
const copy: Record<Section, { title: string; description: string }> = {
  templates: { title: "Templates", description: "Choose a starting idea and build your own story." },
  videos: { title: "Videos", description: "Finished clips from your Creator Lab projects." },
  archive: { title: "Archive", description: "Your archived projects, all in one place." },
  library: { title: "Library", description: "Images and videos generated across your projects." },
  "brand-kits": { title: "Brand Kits", description: "A home for your visual identity." },
  avatars: { title: "Avatars", description: "Characters generated for your stories." },
  voices: { title: "Voices", description: "A home for your story voices." },
};
const ideas = [
  { title: "A story beyond the horizon", tag: "World building", image: "/images/distant-desert.png" },
  { title: "Somewhere new", tag: "Scene making", image: "/images/image.png" },
  { title: "The city after dark", tag: "Cinematic story", image: "/art/city.svg" },
];

export default function CreatorSectionPage({ section }: { section: Section }) {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    if (section === "templates" || section === "brand-kits" || section === "voices") return;
    let live = true;
    listAllProjects(accessToken).then(async (allProjects) => {
      if (!live) return;
      setProjects(allProjects);
      if (section === "archive") return;
      const details = await Promise.allSettled(allProjects.map((project) => getProject(project.id, accessToken)));
      if (!live) return;
      const found = details.flatMap((result) => {
        if (result.status !== "fulfilled") return [];
        const project: ProjectDetail = result.value;
        return project.steps.flatMap((step): Media[] => {
          const url = step.generationJob?.outputUrl;
          if (!url || step.generationJob?.status !== "COMPLETED") return [];
          if (step.kind === "ANIMATION") return [{ id: step.id, title: project.title, projectId: project.id, url, kind: "video" }];
          if (step.kind === "CHARACTER" || step.kind === "SCENE") return [{ id: step.id, title: project.title, projectId: project.id, url, kind: "image" }];
          return [];
        });
      });
      setMedia(found);
    }).catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "Could not load this section."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [accessToken, section, attempt]);

  async function start(title: string) {
    if (!accessToken || creating) return;
    setCreating(title); setError(null);
    try { const project = await createProject(title, accessToken); router.push(`/creator/${project.id}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create project."); setCreating(null); }
  }

  const archived = projects.filter((project) => project.status.toUpperCase() === "ARCHIVED");
  const shownMedia = media.filter((item) => section === "library" || (section === "videos" && item.kind === "video") || (section === "avatars" && item.kind === "image"));
  const emptyCopy = section === "archive" ? "No archived projects yet." : section === "videos" ? "Your finished videos will appear here." : section === "avatars" ? "Your generated characters will appear here." : "Your generated images and videos will appear here.";

  return <div className="creator-workspace min-h-dvh bg-[#0b0b0c] text-[#f5f3f1]">
    <CreatorSidebar activeSection={section} />
    <nav aria-label="Creator Lab mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] items-center justify-around border-t border-white/[.1] bg-[#141415]/95 px-4 backdrop-blur-xl lg:hidden">
      <Link href="/creator" className="flex min-w-16 flex-col items-center gap-1 text-[10px] text-white/55"><FolderOpen className="size-5" />Projects</Link>
      <span aria-current="page" className="flex min-w-16 flex-col items-center gap-1 text-[10px] text-white"><Clapperboard className="size-5" />{copy[section].title}</span>
      <Link href="/" className="flex min-w-16 flex-col items-center gap-1 text-[10px] text-white/55"><Home className="size-5" />App</Link>
    </nav>
    <main className="min-h-dvh pb-24 lg:pl-[250px] lg:pb-12">
      <header className="sticky top-0 z-20 flex min-h-[70px] items-center border-b border-white/[.075] bg-[#0b0b0c]/95 px-4 backdrop-blur-xl sm:px-7 lg:px-8"><Link href="/creator" className="inline-flex items-center gap-2 text-[13px] text-white/55 transition-colors hover:text-white"><Clapperboard className="size-[18px] text-[#ff784e]" />Creator Lab</Link><span className="mx-3 text-white/20">/</span><span className="text-[13px] font-medium text-white">{copy[section].title}</span></header>
      <div className="mx-auto max-w-[1480px] px-4 pt-8 sm:px-7 lg:px-8 lg:pt-10">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#ff8c68]">Your creative workspace</p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-[-.045em] sm:text-[38px]">{copy[section].title}</h1>
        <p className="mt-2 text-[14px] text-white/45">{copy[section].description}</p>
        {error && <div role="alert" className="mt-6 rounded-xl border border-red-300/20 bg-red-300/[.05] px-4 py-3 text-[13px] text-red-200">{error}<button type="button" onClick={() => { setLoading(true); setError(null); setAttempt((value) => value + 1); }} className="ml-3 font-semibold underline underline-offset-2">Retry</button></div>}

        {section === "templates" && <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{ideas.map((idea) => <button key={idea.title} type="button" disabled={creating !== null} onClick={() => void start(idea.title)} className="group overflow-hidden rounded-[18px] border border-white/[.09] bg-[#171718] text-left transition-colors hover:border-white/25 disabled:opacity-60"><span className="block h-48 bg-cover bg-center" style={{ backgroundImage: `url(${idea.image})` }} /><span className="flex items-center justify-between gap-3 p-5"><span><span className="block text-[10px] uppercase tracking-[.14em] text-white/40">{idea.tag}</span><span className="mt-1 block text-[17px] font-semibold">{idea.title}</span></span>{creating === idea.title ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowRight className="size-5 text-white/50" />}</span></button>)}</div>}

        {(section === "brand-kits" || section === "voices") && <div className="mt-8 flex min-h-[270px] flex-col items-start justify-center rounded-[20px] border border-white/[.09] bg-[#171718] p-7 sm:p-10"><p className="text-[19px] font-semibold">{section === "brand-kits" ? "Brand kits are coming to Creator Lab" : "Voice tools are coming to Creator Lab"}</p><p className="mt-2 max-w-lg text-[13px] leading-6 text-white/45">{section === "brand-kits" ? "When brand kit management is available, your colors, logos, and styles will live here." : "When voice generation is available, your saved voices will live here."}</p><Link href="/creator" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[12px] font-semibold text-black transition-colors hover:bg-white/85">Go to projects <ArrowRight className="size-4" /></Link></div>}

        {section === "archive" && (loading ? <Loading /> : archived.length ? <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{archived.map((project) => <Link href={`/creator/${project.id}`} key={project.id} className="group flex min-h-[120px] flex-col justify-between rounded-[17px] border border-white/[.09] bg-[#171718] p-5 transition-colors hover:border-white/25"><span className="text-[15px] font-semibold">{project.title}</span><span className="flex items-center justify-between text-[11px] text-white/40">Updated {new Date(project.updatedAt).toLocaleDateString()}<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span></Link>)}</div> : <Empty message={emptyCopy} />)}

        {(section === "videos" || section === "library" || section === "avatars") && (loading ? <Loading /> : shownMedia.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shownMedia.map((item) => <article key={item.id} className="overflow-hidden rounded-[17px] border border-white/[.09] bg-[#171718]">{item.kind === "video" ? <video controls preload="metadata" src={item.url} className="aspect-video w-full bg-black object-contain" /> : <div role="img" aria-label={`Generated image for ${item.title}`} className="aspect-video bg-[#222] bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${JSON.stringify(item.url)})` }} />}<Link href={`/creator/${item.projectId}`} className="flex items-center justify-between gap-3 p-4 text-[13px] font-medium text-white/80 transition-colors hover:text-white"><span className="truncate">{item.title}</span><ArrowRight className="size-4 shrink-0" /></Link></article>)}</div> : <Empty message={emptyCopy} />)}
      </div>
    </main>
  </div>;
}

function Loading() { return <div className="mt-8 flex min-h-48 items-center justify-center gap-2 rounded-[18px] border border-white/[.08] bg-[#171718] text-[13px] text-white/45"><LoaderCircle className="size-4 animate-spin" />Loading…</div>; }
function Empty({ message }: { message: string }) { return <div className="mt-8 flex min-h-[240px] flex-col items-center justify-center rounded-[18px] border border-dashed border-white/[.12] bg-[#171718] px-5 text-center"><FolderOpen className="size-6 text-white/35" /><p className="mt-4 text-[15px] font-medium">{message}</p><p className="mt-1 text-[12px] text-white/40">Create a project to begin building your library.</p><Link href="/creator" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[12px] font-semibold text-black transition-colors hover:bg-white/85"><Plus className="size-4" />Go to projects</Link></div>; }

async function listAllProjects(token: string): Promise<Project[]> {
  const first = await listProjects(token, 1, 50);
  const projects = [...first.items];
  for (let page = 2; page <= first.totalPages; page += 4) {
    const pages = await Promise.all(Array.from({ length: Math.min(4, first.totalPages - page + 1) }, (_, index) => listProjects(token, page + index, 50)));
    projects.push(...pages.flatMap((result) => result.items));
  }
  return projects;
}
