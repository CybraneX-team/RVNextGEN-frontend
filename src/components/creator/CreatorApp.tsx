"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import { createProject, listProjects, type Project } from "@/lib/creator";
import CreatorHeader from "./CreatorHeader";

function StatusPill({ status }: { status: string }) {
  return <span className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/55">{status}</span>;
}

export default function CreatorApp() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let live = true;
    listProjects(accessToken).then((r) => { if (live) setProjects(r.items); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load projects"); });
    return () => { live = false; };
  }, [accessToken]);

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
    <div className="min-h-screen bg-[#0b0c0d] text-white">
      <CreatorHeader />
      <main className="mx-auto max-w-4xl p-6">
        <div className="mb-8">
          <h1 className="text-[22px] font-semibold tracking-[-0.3px]">Your projects</h1>
          <p className="mt-1 text-[14px] text-white/50">Turn an idea into a film: story → screenplay → characters &amp; scenes → animation.</p>
        </div>

        <div className="mb-8 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void create(); }}
            placeholder="New project title…"
            maxLength={300}
            className="h-11 flex-1 rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-white/30"
          />
          <button onClick={create} disabled={creating} className="h-11 rounded-lg bg-[#2f7d5b] px-5 text-[14px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50">{creating ? "Creating…" : "Create project"}</button>
        </div>

        {error && <p role="alert" className="mb-4 text-[13px] text-[#ff8f8f]">{error}</p>}

        {projects == null ? (
          <p className="text-[13px] text-white/40">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/12 p-8 text-center text-[14px] text-white/40">No projects yet. Create your first one above.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <button onClick={() => router.push(`/creator/${p.id}`)} className="flex w-full flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05]">
                  <span className="text-[15px] font-medium text-white">{p.title}</span>
                  <span className="flex items-center gap-2">
                    <StatusPill status={p.status} />
                    <span className="text-[12px] text-white/40">Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
