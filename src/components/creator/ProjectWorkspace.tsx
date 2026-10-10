"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../AuthProvider";
import { getCreditBalance, getProject, type CreatorStep, type ProjectDetail, type StageStatus, type StageView, type StepKind } from "@/lib/creator";
import { STAGE_META } from "@/lib/creator-models";
import CreatorHeader from "./CreatorHeader";
import StageCard from "./StageCard";
import PublishDialog from "./PublishDialog";

const PREREQ: Record<StepKind, StepKind[]> = {
  STORY: [],
  SCREENPLAY: ["STORY"],
  CHARACTER: ["SCREENPLAY"],
  SCENE: ["SCREENPLAY"],
  ANIMATION: ["CHARACTER", "SCENE"],
};
const PIPELINE: StepKind[] = ["STORY", "SCREENPLAY", "CHARACTER", "SCENE", "ANIMATION"];

/** Latest step per kind (highest order wins — "regenerate" creates a newer step). */
function latestByKind(steps: CreatorStep[]): Partial<Record<StepKind, CreatorStep>> {
  const map: Partial<Record<StepKind, CreatorStep>> = {};
  for (const step of steps) {
    const current = map[step.kind];
    if (!current || step.order > current.order) map[step.kind] = step;
  }
  return map;
}

function deriveStage(kind: StepKind, latest: Partial<Record<StepKind, CreatorStep>>): StageView {
  const step = latest[kind] ?? null;
  if (step) {
    const status: StageStatus = step.status === "READY" ? "READY" : step.status === "FAILED" ? "FAILED" : "GENERATING";
    return { kind, status, step };
  }
  const missing = PREREQ[kind].filter((p) => latest[p]?.status !== "READY");
  if (missing.length === 0) return { kind, status: "AVAILABLE", step: null };
  return { kind, status: "LOCKED", step: null, lockedReason: `Finish ${missing.map((m) => STAGE_META[m].label).join(" & ")} first.` };
}

function ProductionCanvas({ project, steps }: { project: ProjectDetail; steps: Partial<Record<StepKind, CreatorStep>> }) {
  const film = steps.ANIMATION?.generationJob?.outputUrl;
  const assets = [
    { label: "Character direction", url: steps.CHARACTER?.generationJob?.outputUrl },
    { label: "Scene direction", url: steps.SCENE?.generationJob?.outputUrl },
  ].filter((asset): asset is { label: string; url: string } => Boolean(asset.url));
  const textAssets = [
    { label: "Story", text: steps.STORY?.outputJson?.text },
    { label: "Screenplay", text: steps.SCREENPLAY?.outputJson?.text },
  ].filter((asset): asset is { label: string; text: string } => Boolean(asset.text));
  const hasContent = Boolean(film || assets.length || textAssets.length);

  return <section className="overflow-hidden rounded-[22px] border border-white/[.08] bg-[#111011] shadow-[0_24px_80px_#0005]">
    <div className="flex items-center justify-between gap-3 border-b border-white/[.07] px-4 py-3.5 sm:px-5">
      <div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-white/35">Studio canvas</p><h2 className="mt-1 truncate text-[14px] font-semibold text-white/85">{project.title}</h2></div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[.08] bg-white/[.025] px-2.5 py-1 text-[10px] text-white/45"><span className={`size-1.5 rounded-full ${film ? "bg-[#e5b27f]" : "bg-white/30"}`} />{film ? "Film ready" : "Live preview"}</span>
    </div>
    <div className="relative min-h-[300px] overflow-hidden bg-[radial-gradient(ellipse_at_50%_38%,rgba(116,68,41,.2),transparent_55%),linear-gradient(135deg,#171517,#0d0c0d)] p-4 sm:min-h-[420px] sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:36px_36px]" />
      {!hasContent ? <div className="relative flex min-h-[260px] flex-col items-center justify-center text-center sm:min-h-[370px]">
        <span className="mb-4 grid size-14 place-items-center rounded-2xl border border-[#e5b27f]/20 bg-[#e5b27f]/[.06] text-[#e5b27f]"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9m6 12V9" /></svg></span>
        <h3 className="text-[15px] font-semibold text-white/85">Your canvas starts here</h3><p className="mt-2 max-w-[270px] text-[12px] leading-5 text-white/40">Generate a story, character, scene, or film to see it take shape here.</p>
      </div> : <div className="relative mx-auto flex min-h-[260px] max-w-2xl flex-col justify-center sm:min-h-[370px]">
        {film ? <div className="overflow-hidden rounded-[16px] border border-white/10 bg-black shadow-[0_16px_60px_#0008]">
          <video src={film} controls playsInline className="aspect-video w-full bg-black object-contain" />
          <div className="flex items-center justify-between gap-3 px-3.5 py-3"><div><p className="text-[12px] font-semibold text-white/85">Final animation</p><p className="mt-0.5 text-[10px] text-white/40">Generated for {project.title}</p></div><span className="rounded-full border border-[#e5b27f]/20 bg-[#e5b27f]/[.06] px-2.5 py-1 text-[10px] text-[#e7bd94]">Ready to review</span></div>
        </div> : assets.length ? <div className={`grid gap-3 ${assets.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {assets.map((asset) => <figure key={asset.label} className="overflow-hidden rounded-[16px] border border-white/10 bg-[#191718] shadow-[0_16px_50px_#0006]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt={asset.label} className="aspect-[4/5] w-full object-cover sm:aspect-[3/2]" referrerPolicy="no-referrer" />
            <figcaption className="px-3 py-2.5 text-[11px] font-medium text-white/70">{asset.label}</figcaption>
          </figure>)}
        </div> : <div className="grid gap-3 sm:grid-cols-2">
          {textAssets.map((asset) => <article key={asset.label} className="max-h-72 overflow-y-auto rounded-[16px] border border-white/[.08] bg-[#191718]/90 p-4 shadow-[0_16px_50px_#0006] sm:p-5"><p className="mb-3 text-[9px] font-semibold uppercase tracking-[.18em] text-[#e5b27f]/70">{asset.label} draft</p><p className="whitespace-pre-wrap text-[12px] leading-6 text-white/70">{asset.text}</p></article>)}
        </div>}
      </div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[.06] px-4 py-3 text-[10px] text-white/35 sm:px-5"><span>{project.steps.length} generation {project.steps.length === 1 ? "step" : "steps"}</span><span>Changes save to this project</span></div>
  </section>;
}

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { accessToken } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [publishJobId, setPublishJobId] = useState<string | null>(null);
  const pollRef = useRef<number | undefined>(undefined);

  const reload = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [detail, credits] = await Promise.all([getProject(projectId, accessToken), getCreditBalance(accessToken)]);
      setProject(detail);
      setBalance(credits.balance);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this project");
    }
  }, [accessToken, projectId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: state is set after the awaited load, not synchronously
  useEffect(() => { void reload(); }, [reload]);

  // Single project-wide poller: runs only while a step is still generating.
  const anyGenerating = useMemo(
    () => (project?.steps ?? []).some((s) => s.status === "GENERATING" || s.status === "DRAFT"),
    [project],
  );
  useEffect(() => {
    window.clearInterval(pollRef.current);
    if (!anyGenerating) return;
    pollRef.current = window.setInterval(() => { void reload(); }, 4000);
    return () => window.clearInterval(pollRef.current);
  }, [anyGenerating, reload]);

  const latest = useMemo(() => latestByKind(project?.steps ?? []), [project]);
  const stageOf = (kind: StepKind) => deriveStage(kind, latest);
  const stages = PIPELINE.map(stageOf);
  const completedStages = stages.filter((stage) => stage.status === "READY").length;
  const progress = Math.round((completedStages / stages.length) * 100);
  const activeStage = stages.find((stage) => stage.status === "GENERATING" || stage.status === "AVAILABLE" || stage.status === "FAILED") ?? null;

  const stageProps = { projectId, token: accessToken ?? "", balance, onChanged: () => void reload() };

  return (
    <div className="min-h-dvh bg-[#0e0d0f] text-white">
      <CreatorHeader balance={balance} />
      <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-5 sm:px-6 sm:pt-8 xl:px-10">
        <div className="mb-6 rounded-[22px] border border-[#d9a26d]/12 bg-[radial-gradient(ellipse_at_top_right,rgba(167,91,47,.14),transparent_60%),#171517] p-4 sm:mb-7 sm:p-6">
          <Link href="/creator" className="inline-flex items-center gap-2 text-[12px] text-white/50 transition-colors hover:text-[#e5b27f]"><span aria-hidden="true">←</span> All projects</Link>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.18em] text-[#d7a574]/70">Project workspace</p>
          <h1 className="mt-1 break-words text-[24px] leading-tight font-semibold tracking-[-.7px] sm:text-[30px]">{project?.title ?? "Loading project…"}</h1>
        </div>

        {project && <section aria-label="Project progress" className="mb-6 rounded-[20px] border border-white/[.08] bg-[#171517] p-4 sm:mb-7 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.17em] text-white/40">Production progress</p><p className="mt-1 text-[14px] font-medium text-white/85">{completedStages} of {stages.length} stages complete</p></div>
            <span className="rounded-full border border-[#e5b27f]/15 bg-[#e5b27f]/[.06] px-2.5 py-1 text-[11px] font-semibold text-[#e7bd94]">{progress}%</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-gradient-to-r from-[#a96a42] to-[#e5b27f] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
          <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2.5">
            {stages.map((stage, index) => {
              const complete = stage.status === "READY";
              const current = activeStage?.kind === stage.kind;
              return <div key={stage.kind} className="min-w-0 text-center">
                <span className={`mx-auto grid size-7 place-items-center rounded-full border text-[11px] font-semibold sm:size-8 ${complete ? "border-[#e5b27f]/45 bg-[#e5b27f]/15 text-[#f0c493]" : current ? "border-[#e5b27f]/45 bg-[#e5b27f]/[.08] text-[#e5b27f]" : "border-white/10 bg-white/[.025] text-white/30"}`}>
                  {complete ? <svg aria-hidden="true" viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 10 4 4 8-8" /></svg> : String(index + 1).padStart(2, "0")}
                </span>
                <span className={`mt-1.5 block truncate text-[9px] sm:text-[10px] ${complete || current ? "text-white/70" : "text-white/30"}`}>{stage.kind === "CHARACTER" ? "Characters" : stage.kind === "ANIMATION" ? "Film" : stage.kind === "SCREENPLAY" ? "Script" : stage.kind === "SCENE" ? "Scenes" : "Story"}</span>
              </div>;
            })}
          </div>
          <p className="mt-3 border-t border-white/[.06] pt-3 text-[11px] text-white/40">{activeStage ? activeStage.status === "GENERATING" ? `Currently creating: ${STAGE_META[activeStage.kind].label}` : activeStage.status === "FAILED" ? `${STAGE_META[activeStage.kind].label} needs another try` : `${STAGE_META[activeStage.kind].label} is ready when you are` : "Your production pipeline is complete."}</p>
        </section>}

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-300/15 bg-red-300/[.05] px-4 py-3 text-[12px] text-[#ff9b9b]">{error}</p>}
        {!project ? (
          <div className="grid min-h-72 place-items-center rounded-[22px] border border-white/[.07] bg-white/[.02] text-[12px] text-white/40">Loading your studio…</div>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(290px,.82fr)_minmax(0,1.18fr)] lg:gap-5">
            <aside className="order-2 flex min-w-0 flex-col gap-3 sm:gap-4 lg:order-1">
              <div className="px-1"><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#d7a574]/65">Creative process</p><p className="mt-1 text-[11px] text-white/40">Build your film one layer at a time.</p></div>
              <StageCard stage={stageOf("STORY")} index={1} {...stageProps} />
              <StageCard stage={stageOf("SCREENPLAY")} index={2} {...stageProps} />

              <div className="rounded-[20px] border border-white/[.07] bg-white/[.015] p-3 sm:p-4">
                <div className="mb-3 flex items-end justify-between px-1"><div><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-[#d7a574]/65">Visual development</p><h2 className="mt-1 text-[15px] font-semibold text-white/85">Build the look</h2></div><span className="text-[10px] text-white/35">02 stages</span></div>
                <div className="flex flex-col gap-3 sm:gap-4">
                  <StageCard stage={stageOf("CHARACTER")} index={3} {...stageProps} />
                  <StageCard stage={stageOf("SCENE")} index={4} {...stageProps} />
                </div>
              </div>

              <StageCard stage={stageOf("ANIMATION")} index={5} {...stageProps} onPublish={(jobId) => setPublishJobId(jobId)} />
            </aside>
            <div className="order-1 min-w-0 lg:sticky lg:top-[90px] lg:order-2"><ProductionCanvas project={project} steps={latest} /></div>
          </div>
        )}
      </main>

      {publishJobId && project && (
        <PublishDialog
          jobId={publishJobId}
          defaultTitle={project.title}
          token={accessToken ?? ""}
          onClose={() => setPublishJobId(null)}
          onPublished={() => { setPublishJobId(null); void reload(); }}
        />
      )}
    </div>
  );
}
