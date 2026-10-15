"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Film, FolderOpen, Home, LoaderCircle, Pencil, Plus, Save } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { editStep, getCreditBalance, getProject, runStep, type CreatorStep, type ProjectDetail, type StageView, type StepKind } from "@/lib/creator";
import { modelsForKind, STAGE_META } from "@/lib/creator-models";
import PublishDialog from "./PublishDialog";

const PREREQ: Record<StepKind, StepKind[]> = {
  STORY: [], SCREENPLAY: ["STORY"], CHARACTER: ["SCREENPLAY"],
  SCENE: ["SCREENPLAY"], ANIMATION: ["CHARACTER", "SCENE"],
};
const BOARD_STAGES: StepKind[] = ["SCREENPLAY", "CHARACTER", "SCENE", "STORY"];

function latestByKind(steps: CreatorStep[]): Partial<Record<StepKind, CreatorStep>> {
  const result: Partial<Record<StepKind, CreatorStep>> = {};
  for (const step of steps) if (!result[step.kind] || step.order > result[step.kind]!.order) result[step.kind] = step;
  return result;
}

function deriveStage(kind: StepKind, latest: Partial<Record<StepKind, CreatorStep>>): StageView {
  const step = latest[kind] ?? null;
  if (step) return { kind, step, status: step.status === "READY" ? "READY" : step.status === "FAILED" ? "FAILED" : "GENERATING" };
  const missing = PREREQ[kind].filter((required) => latest[required]?.status !== "READY");
  return missing.length ? { kind, step: null, status: "LOCKED", lockedReason: `Complete ${missing.map((item) => STAGE_META[item].label.toLowerCase()).join(" and ")} first.` } : { kind, step: null, status: "AVAILABLE" };
}

function StagePreview({ stage, projectTitle, projectId, token, onChanged, onPublish }: {
  stage: StageView; projectTitle: string; projectId: string; token: string; onChanged: () => void; onPublish: (jobId: string) => void;
}) {
  const { kind, step, status } = stage;
  const label = kind === "ANIMATION" ? "Film" : kind === "CHARACTER" ? "Character" : kind === "SCENE" ? "Scene" : STAGE_META[kind].label;
  const outputUrl = step?.generationJob?.outputUrl;
  const text = step?.outputJson?.text;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function saveEdit() {
    if (!step || saving) return;
    const value = draft.trim();
    if (!value) { setEditError("Text can’t be empty."); return; }
    setSaving(true); setEditError(null);
    try {
      await editStep(projectId, step.id, value, token);
      setEditing(false);
      onChanged();
    } catch (cause) { setEditError(cause instanceof Error ? cause.message : "Could not save this edit."); }
    finally { setSaving(false); }
  }

  return <section aria-label={`${label} preview`} className="creator-preview mx-auto flex w-full max-w-[clamp(340px,48%,640px)] flex-col overflow-hidden rounded-[10px] bg-[#141414] text-left">
    <div className="flex items-center justify-between gap-3 px-3.5 pt-3.5">
      <p className="min-w-0 truncate text-md text-white/70">Preview - {label}</p>
      {status !== "READY" && status !== "AVAILABLE" && <span className="rounded-full border border-white/[.08] px-2 py-0.5 text-[9px] text-white/40">{status === "GENERATING" ? "Creating" : status === "FAILED" ? "Needs retry" : "Locked"}</span>}
    </div>
    <div className="creator-preview-body min-h-[150px] flex-1 px-3.5 pb-3.5 pt-2.5">
      {kind === "ANIMATION" && outputUrl ? <video src={outputUrl} controls playsInline className="aspect-video w-full rounded-lg bg-black object-contain" />
        : (kind === "CHARACTER" || kind === "SCENE") && outputUrl ? <div className="relative h-[min(46vh,440px)] w-full"><Image src={outputUrl} alt={`${label} visual for ${projectTitle}`} fill sizes="(max-width: 768px) 100vw, 690px" unoptimized referrerPolicy="no-referrer" className="rounded-lg object-contain" /></div>
          : editing ? <textarea aria-label={`Edit ${label.toLowerCase()} text`} autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} disabled={saving} className="min-h-[465px] max-h-[46vh] w-full resize-y bg-transparent text-sm leading-[1.6] text-white/80 outline-none disabled:opacity-60" />
            : text ? <p className="max-h-[46vh] overflow-y-auto whitespace-pre-wrap text-sm leading-[1.6] text-white/35">{text}</p>
              : status === "GENERATING" ? <div className="flex h-full min-h-[150px] items-center justify-center gap-2 text-[11px] text-white/45"><LoaderCircle className="size-4 animate-spin" /> Creating your {label.toLowerCase()}…</div>
                : <p className="text-sm leading-[1.6] text-white/30">{status === "LOCKED" ? stage.lockedReason : `Describe your ${label.toLowerCase()} below to see it here.`}</p>}
    </div>
    {editError && <p role="alert" className="px-3.5 pb-2 text-[11px] text-red-300">{editError}</p>}
    {status === "READY" && (text || (kind === "ANIMATION" && outputUrl)) && <div className="flex items-center justify-end gap-2 border-t border-white/[.05] px-3 py-2">
      {text && (editing ? <>
        <button type="button" onClick={() => { setEditing(false); setEditError(null); }} disabled={saving} className="rounded-lg px-3 py-1.5 text-[11px] text-white/55 transition-colors hover:bg-white/[.05] hover:text-white disabled:opacity-40">Cancel</button>
        <button type="button" onClick={() => void saveEdit()} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-[#101013] disabled:opacity-50">{saving ? <LoaderCircle className="size-3 animate-spin" /> : <Save className="size-3" />}{saving ? "Saving…" : "Save changes"}</button>
      </> : <button type="button" onClick={() => { setDraft(text); setEditError(null); setEditing(true); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] text-white/55 transition-colors hover:bg-white/[.05] hover:text-white"><Pencil className="size-3" /> Edit text</button>)}
      {kind === "ANIMATION" && outputUrl && step?.generationJob && <button type="button" onClick={() => onPublish(step.generationJob!.id)} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-[#101013]">Publish film</button>}
    </div>}
  </section>;
}

function WorkspaceComposer({ stage, projectId, token, balance, onChanged }: {
  stage: StageView; projectId: string; token: string; balance: number | null; onChanged: () => void;
}) {
  const { kind, status } = stage;
  const models = modelsForKind(kind);
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState(models[0]?.model ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const model = models.find((item) => item.model === modelId) ?? models[0];
  const tooPoor = balance != null && balance < (model?.credits ?? 0);

  async function submit() {
    if (busy || status === "LOCKED" || status === "GENERATING") return;
    const value = prompt.trim();
    if (value.length < 3) { setError("Describe what you want in a little more detail."); return; }
    setBusy(true); setError(null);
    try {
      await runStep(projectId, kind, { prompt: value, provider: model?.provider, model: model?.model }, token);
      setPrompt(""); onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not complete this step."); }
    finally { setBusy(false); }
  }

  return <section aria-label={`${STAGE_META[kind].label} composer`} className="creator-composer mx-auto w-full max-w-[clamp(340px,48%,640px)] rounded-2xl border border-white/[.07] px-3.5 pb-2.5 pt-3">
    <textarea
      aria-label={`Describe ${STAGE_META[kind].label}`}
      value={prompt}
      onChange={(event) => setPrompt(event.target.value)}
      placeholder={status === "LOCKED" ? stage.lockedReason : "Describe your scene...."}
      disabled={status === "LOCKED" || status === "GENERATING" || busy}
      maxLength={4000}
      className="block min-h-20 w-full resize-none bg-transparent text-sm leading-[1.5] text-white/80 outline-none placeholder:text-white/30 disabled:cursor-not-allowed disabled:opacity-60"
    />
    <div className="flex items-center gap-2 pt-2">
      <span aria-hidden="true" className="grid size-6 place-items-center text-white/40"><Plus className="size-3.5" /></span>
      <span className="text-sm text-white/25">{balance == null ? "" : `${balance} credits`}</span>
      <div className="ml-auto flex min-w-0 items-center gap-2.5">
        <select aria-label="Generation model" value={model?.model ?? ""} onChange={(event) => setModelId(event.target.value)} className="max-w-[130px] min-w-0 bg-transparent text-sm text-white/45 outline-none sm:max-w-[190px]">{models.map((item) => <option key={item.model} value={item.model} className="bg-[#171719] text-white">{item.label} · {item.credits} cr</option>)}</select>
        <button type="button" onClick={() => void submit()} disabled={busy || tooPoor || status === "LOCKED" || status === "GENERATING"} className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-sm font-medium text-[#111114] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-35">{busy ? <LoaderCircle className="size-3 animate-spin" /> : null}{busy ? "Working…" : status === "READY" ? "Regenerate" : "Generate"}</button>
      </div>
    </div>
    {tooPoor && <p className="mt-2 text-[10px] text-amber-200/70">Not enough credits for this model.</p>}
    {error && <p role="alert" className="mt-2 text-[10px] text-red-300">{error}</p>}
  </section>;
}

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { accessToken } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<StepKind>("STORY");
  const [publishJobId, setPublishJobId] = useState<string | null>(null);
  const pollRef = useRef<number | undefined>(undefined);

  const reload = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [detail, credits] = await Promise.all([getProject(projectId, accessToken), getCreditBalance(accessToken)]);
      setProject(detail); setBalance(credits.balance); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load this project."); }
  }, [accessToken, projectId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reload updates state only after awaited network requests.
  useEffect(() => { void reload(); }, [reload]);
  const generating = useMemo(() => project?.steps.some((step) => step.status === "GENERATING" || step.status === "DRAFT") ?? false, [project]);
  useEffect(() => {
    window.clearInterval(pollRef.current);
    if (generating) pollRef.current = window.setInterval(() => { void reload(); }, 4000);
    return () => window.clearInterval(pollRef.current);
  }, [generating, reload]);

  const latest = useMemo(() => latestByKind(project?.steps ?? []), [project]);
  const selectedStage = deriveStage(selectedKind, latest);
  function selectStage(kind: StepKind) { setSelectedKind(kind); }

  return <div className="creator-workspace min-h-dvh bg-[#0e0e10] text-white lg:h-dvh lg:overflow-hidden">
    <nav aria-label="Creator Lab navigation" className="creator-rail fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-between border-t border-white/[.07] bg-[#101012] px-3 lg:inset-y-0 lg:right-auto lg:h-auto lg:w-18 lg:flex-col lg:justify-start lg:gap-4 lg:border-r lg:border-t-0 lg:px-0 lg:pt-3 pb-2">
      <Link href="/creator" title="Your projects" aria-label="Your projects" className="grid size-12 place-items-center rounded-lg text-white/75 transition-colors hover:bg-white/[.06] hover:text-white"><FolderOpen className="size-5" /></Link>
      <Link href="/" title="Back to app" aria-label="Back to app" className="grid size-12 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/[.06] hover:text-white"><Home className="size-5" /></Link>
      <button type="button" title="Film stage" aria-label="Open film stage" onClick={() => selectStage("ANIMATION")} className={`grid size-12 place-items-center rounded-lg transition-colors hover:bg-white/[.06] ${selectedKind === "ANIMATION" ? "bg-white/[.07] text-white" : "text-white/40"}`}><Film className="size-5" /></button>
      <div className="hidden flex-1 lg:block" />
      <Link href="/creator" title="All projects" aria-label="All projects" className="hidden size-12 place-items-center rounded-lg text-white/35 transition-colors hover:bg-white/[.06] hover:text-white lg:grid"><ArrowLeft className="size-5" /></Link>
    </nav>

    <main className="creator-workspace-main mx-auto flex min-h-dvh w-full max-w-[90dvw] flex-col pb-[72px] lg:h-dvh lg:min-h-0 lg:pl-[42px] lg:pb-0">
      <h1 className="sr-only">{project?.title ?? "Creator Lab"}</h1>

      {error && <div role="alert" className="mx-4 mt-3 rounded-lg border border-red-300/20 bg-red-300/[.04] px-3 py-2 text-[12px] text-red-200 sm:mx-6">{error} <button type="button" onClick={() => void reload()} className="ml-2 underline">Retry</button></div>}
      {!project ? <div className="grid flex-1 place-items-center text-[13px] text-white/40">Loading your workspace…</div> : <>
        <section aria-label="Creative stages" className="creator-stage-strip grid shrink-0 grid-flow-col auto-cols-[minmax(190px,1fr)] gap-1.5 overflow-x-auto px-3.5 pb-3 pt-3.5 lg:grid-cols-4 lg:grid-flow-row lg:overflow-visible lg:pt-2.5">
          {BOARD_STAGES.map((kind) => {
            const stage = deriveStage(kind, latest);
            const active = selectedKind === kind;
            const summary = stage.step?.outputJson?.text ?? stage.step?.inputJson?.prompt ?? (stage.status === "LOCKED" ? stage.lockedReason : kind === "CHARACTER" ? "Create your first character…" : kind === "SCENE" ? "Design your first scene…" : kind === "STORY" ? "Start with the world and its central idea…" : "Turn your story into scenes and dialogue…");
            return <button key={kind} type="button" onClick={() => selectStage(kind)} aria-pressed={active} className={`creator-stage-card flex h-40 min-w-0 flex-col overflow-hidden rounded-[9px] border px-3 pb-3 pt-3 text-left transition-[background-color,border-color] duration-200 ${active ? "border-white/[.18] bg-[#161617]" : "border-white/[.04] bg-[#141415] hover:border-white/[.1] hover:bg-[#1a1a1c]"}`}>
              <span className="flex items-center justify-between gap-2 text-md text-white/75"><span>{kind === "CHARACTER" ? "Character" : kind === "SCENE" ? "Scene" : STAGE_META[kind].label}</span><span className={`size-1.5 rounded-full ${stage.status === "READY" ? "bg-[#d9b28c]" : stage.status === "GENERATING" ? "bg-white/55 animate-pulse" : "bg-white/15"}`} /></span>
              <span className="mt-1.5 line-clamp-4 text-sm leading-[1.55] text-white/30">{summary}</span>
            </button>;
          })}
        </section>

        <div className="creator-stage-center flex min-h-[240px] flex-1 items-center justify-center px-3.5 pb-4 pt-8 lg:min-h-0 lg:overflow-y-auto ">
          <StagePreview key={selectedKind} stage={selectedStage} projectTitle={project.title} projectId={projectId} token={accessToken ?? ""} onChanged={() => void reload()} onPublish={setPublishJobId} />
        </div>

        <div className="creator-composer-area shrink-0 px-3.5 pb-5 lg:pb-8">
          <WorkspaceComposer key={selectedKind} stage={selectedStage} projectId={projectId} token={accessToken ?? ""} balance={balance} onChanged={() => void reload()} />
        </div>
      </>}
    </main>

    {publishJobId && project && <PublishDialog jobId={publishJobId} defaultTitle={project.title} token={accessToken ?? ""} onClose={() => setPublishJobId(null)} onPublished={() => { setPublishJobId(null); void reload(); }} />}
  </div>;
}
