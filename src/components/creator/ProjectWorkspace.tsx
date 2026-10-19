"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, FolderOpen, Home, LoaderCircle, MessageSquareText, Pencil, RotateCcw } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { editStep, getCreditBalance, getProject, quoteStep, runStep, type CreatorStep, type ProjectDetail, type StageView, type StepKind } from "@/lib/creator";
import { modelsForKind, STAGE_META } from "@/lib/creator-models";
import PublishDialog from "./PublishDialog";
import CreatorSidebar from "./CreatorSidebar";
import ModelPicker from "./ModelPicker";
import RichTextDocument from "./RichTextDocument";
import InfiniteCanvas from "./InfiniteCanvas";
import { deriveStage, guidedWorkflow, latestByKind, WORKFLOW_COPY, WORKFLOW_ORDER } from "@/lib/creator-workflow";
import styles from "./ProjectWorkspace.module.css";

function StagePreview({ stage, projectTitle, projectId, token, onChanged, onPublish, onRefine }: {
  stage: StageView; projectTitle: string; projectId: string; token: string; onChanged: () => void; onPublish: (jobId: string) => void; onRefine?: () => void;
}) {
  const { kind, step, status } = stage;
  const label = kind === "ANIMATION" ? "Film" : kind === "CHARACTER" ? "Character" : kind === "SCENE" ? "Scene" : STAGE_META[kind].label;
  const outputUrl = step?.generationJob?.outputUrl;
  const text = step?.outputJson?.text;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function saveEdit(markdown: string) {
    if (!step || saving) return;
    const value = markdown.trim();
    if (!value) { setEditError("Text can’t be empty."); return; }
    setSaving(true); setEditError(null);
    try {
      await editStep(projectId, step.id, value, token);
      setEditing(false);
      onChanged();
    } catch (cause) { setEditError(cause instanceof Error ? cause.message : "Could not save this edit."); }
    finally { setSaving(false); }
  }

  return <section aria-label={`${label} preview`} className={`${styles.enter} mx-auto flex w-full max-w-[860px] flex-col overflow-hidden rounded-[20px] border border-white/[.09] bg-[#171718] text-left shadow-[0_18px_70px_#0003]`}>
    <div className="flex items-center justify-between gap-3 border-b border-white/[.07] px-5 py-4 sm:px-7">
      <div><p className="text-[10px] uppercase tracking-[.16em] text-white/35">Your {label.toLowerCase()}</p><h2 className="mt-1 text-[17px] font-medium text-white/90">{projectTitle}</h2></div>
      {onRefine && <button type="button" onClick={onRefine} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[11px] text-white/60 hover:bg-white/[.06] hover:text-white"><RotateCcw className="size-3" />Refine</button>}
      {status !== "READY" && status !== "AVAILABLE" && <span className="rounded-full border border-white/[.08] px-2 py-0.5 text-[9px] text-white/40">{status === "GENERATING" ? "Creating" : status === "FAILED" ? "Needs retry" : "Locked"}</span>}
    </div>
    <div className="min-h-[180px] flex-1 p-5 sm:p-7">
      {kind === "ANIMATION" && outputUrl ? <video src={outputUrl} controls playsInline className="aspect-video w-full rounded-lg bg-black object-contain" />
        : (kind === "CHARACTER" || kind === "SCENE") && outputUrl ? <div className="relative h-[min(46vh,440px)] w-full"><Image src={outputUrl} alt={`${label} visual for ${projectTitle}`} fill sizes="(max-width: 768px) 100vw, 690px" unoptimized referrerPolicy="no-referrer" className="rounded-lg object-contain" /></div>
          : text ? <RichTextDocument text={text} label={label} editing={editing} saving={saving} onSave={(markdown) => void saveEdit(markdown)} onCancel={() => { setEditing(false); setEditError(null); }} />
              : status === "GENERATING" ? <div className="flex h-full min-h-[150px] items-center justify-center gap-2 text-[11px] text-white/45"><LoaderCircle className="size-4 animate-spin" /> Creating your {label.toLowerCase()}…</div>
                : <p className="text-sm leading-[1.6] text-white/30">{status === "LOCKED" ? stage.lockedReason : `Describe your ${label.toLowerCase()} below to see it here.`}</p>}
    </div>
    {editError && <p role="alert" className="px-3.5 pb-2 text-[11px] text-red-300">{editError}</p>}
    {status === "READY" && (text || (kind === "ANIMATION" && outputUrl)) && <div className="flex items-center justify-end gap-2 border-t border-white/[.05] px-3 py-2">
      {text && !editing && <button type="button" onClick={() => { setEditError(null); setEditing(true); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] text-white/55 transition-colors hover:bg-white/[.05] hover:text-white"><Pencil className="size-3" /> Edit text</button>}
      {kind === "ANIMATION" && outputUrl && step?.generationJob && <button type="button" onClick={() => onPublish(step.generationJob!.id)} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-[#101013]">Publish film</button>}
    </div>}
  </section>;
}

function WorkspaceComposer({ stage, projectId, token, balance, onSubmitted }: {
  stage: StageView; projectId: string; token: string; balance: number | null; onSubmitted: (step: CreatorStep) => void;
}) {
  const { kind, status } = stage;
  const models = modelsForKind(kind);
  const [prompt, setPrompt] = useState(stage.step?.inputJson?.prompt ?? "");
  const [modelId, setModelId] = useState(models[0] ? `${models[0].provider}/${models[0].model}` : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedCredits, setEstimatedCredits] = useState<number | null>(null);
  const model = models.find((item) => `${item.provider}/${item.model}` === modelId) ?? models[0];
  const tooPoor = balance != null && balance <= 0;

  useEffect(() => {
    if (!token || !model) return;
    let live = true;
    const handle = window.setTimeout(() => {
      quoteStep({ operation: STAGE_META[kind].operation, provider: model.provider, model: model.model, promptChars: prompt.trim().length }, token)
        .then((quote) => { if (live) setEstimatedCredits(quote.estimatedCredits); })
        .catch(() => { if (live) setEstimatedCredits(null); });
    }, 400);
    return () => { live = false; window.clearTimeout(handle); };
  }, [kind, model, prompt, token]);

  async function submit() {
    if (busy || tooPoor || status === "LOCKED" || status === "GENERATING") return;
    const value = prompt.trim();
    if (value.length < 3) { setError("Describe what you want in a little more detail."); return; }
    setBusy(true); setError(null);
    try {
      const step = await runStep(projectId, kind, { prompt: value, provider: model?.provider, model: model?.model }, token);
      onSubmitted(step);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not complete this step."); }
    finally { setBusy(false); }
  }

  return <section aria-label={`${STAGE_META[kind].label} composer`} className="w-full rounded-[20px] border border-white/[.12] bg-[#202021] p-4 shadow-[0_10px_40px_#0002] transition-colors focus-within:border-white/30 sm:p-5">
    <textarea
      aria-label={`Describe ${STAGE_META[kind].label}`}
      value={prompt}
      onChange={(event) => setPrompt(event.target.value)}
      placeholder={status === "LOCKED" ? stage.lockedReason : WORKFLOW_COPY[kind].placeholder}
      disabled={status === "LOCKED" || status === "GENERATING" || busy}
      maxLength={4000}
      className="block min-h-32 w-full resize-y bg-transparent text-[14px] leading-[1.7] text-white/85 outline-none placeholder:text-white/35 disabled:cursor-not-allowed disabled:opacity-60"
    />
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[.07] pt-3">
      <ModelPicker models={models} value={modelId} onChange={setModelId} disabled={busy || status === "GENERATING"} />
      <button type="button" onClick={() => void submit()} disabled={busy || tooPoor || status === "LOCKED" || status === "GENERATING"} className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[12px] font-medium text-[#111114] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40">{busy || status === "GENERATING" ? <LoaderCircle className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}{busy || status === "GENERATING" ? "Creating…" : status === "READY" ? "Regenerate" : status === "FAILED" ? "Retry" : "Generate"}</button>
    </div>
    <div className="flex items-center mt-3 justify-between">
      <p className="text-[12px] text-white/35">{balance == null ? "" : `${(balance / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} credits available`}</p>
      {status === "GENERATING" && <p role="status" className="text-[12px] leading-5 text-white/65">Creating your {WORKFLOW_COPY[kind].label.toLowerCase()}… Your result will appear here when it’s ready.</p>}
      {status === "FAILED" && <p role="alert" className="text-[12px] text-red-300">This generation didn’t finish. Your prompt is saved; you can try again.</p>}
      {estimatedCredits != null && <p className="text-[12px] text-white/35">Estimated up to {estimatedCredits.toLocaleString(undefined, { maximumFractionDigits: 2 })} credits</p>}
      {tooPoor && <p className="text-[12px] text-amber-200/70">Not enough credits for this model.</p>}
      {error && <p role="alert" className="text-[12px] text-red-300">{error}</p>}
    </div>
  </section>;
}

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { accessToken } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<StepKind | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [revisionKind, setRevisionKind] = useState<StepKind | null>(null);
  const [publishJobId, setPublishJobId] = useState<string | null>(null);
  const projectRef = useRef<ProjectDetail | null>(null);
  const requestRef = useRef(0);
  const composerRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    if (!accessToken) return;
    const request = ++requestRef.current;
    try {
      const [detail, credits] = await Promise.all([getProject(projectId, accessToken), getCreditBalance(accessToken)]);
      if (request !== requestRef.current) return;
      const before = latestByKind(projectRef.current?.steps ?? []);
      const after = latestByKind(detail.steps);
      const completedKind = WORKFLOW_ORDER.find((kind) => before[kind] && before[kind]?.status !== "READY" && after[kind]?.status === "READY");
      if (completedKind) { setSelectedKind(completedKind); setSelectedStepId(after[completedKind]?.id ?? null); }
      setRevisionKind((kind) => kind && before[kind]?.status !== "READY" && after[kind]?.status === "READY" ? null : kind);
      projectRef.current = detail;
      setProject(detail); setBalance(credits.balance); setError(null);
    } catch (cause) {
      if (request === requestRef.current) setError(cause instanceof Error ? cause.message : "Could not load this project.");
    }
  }, [accessToken, projectId]);

  useEffect(() => { void reload(); return () => { requestRef.current += 1; }; }, [reload]);
  const workflow = useMemo(() => guidedWorkflow(project?.steps ?? [], selectedKind), [project, selectedKind]);
  const generating = Object.values(workflow.latest).some((step) => step.status === "GENERATING" || step.status === "DRAFT");
  useEffect(() => {
    if (!generating) return;
    let stopped = false;
    let timer: number;
    async function poll() {
      await reload();
      if (!stopped) timer = window.setTimeout(poll, 2500);
    }
    timer = window.setTimeout(poll, 2500);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [generating, reload]);

  function submitted(step: CreatorStep) {
    const current = projectRef.current;
    if (!current) return;
    requestRef.current += 1;
    const updated = { ...current, steps: [...current.steps.filter((item) => item.id !== step.id), step] };
    projectRef.current = updated;
    setProject(updated);
    setSelectedKind(step.kind);
    if (step.status === "READY") setSelectedStepId(step.id);
    setRevisionKind((kind) => step.status === "READY" ? null : kind);
    void reload();
  }

  const composingKind = revisionKind ?? workflow.next;
  const composerStage = composingKind ? deriveStage(composingKind, workflow.latest) : null;
  const previewStage = workflow.preview ? deriveStage(workflow.preview, workflow.latest) : null;
  const hasResult = previewStage !== null;
  const completedCount = workflow.completed.length;
  const activeLabel = composingKind ? WORKFLOW_COPY[composingKind].label : "Film complete";
  const canvasSteps = (project?.steps ?? []).filter((step) => step.status === "READY").sort((a, b) => a.order - b.order);
  const canvasSelection = selectedStepId && canvasSteps.some((step) => step.id === selectedStepId) ? selectedStepId : canvasSteps[0]?.id ?? null;
  const selectedCanvasStep = canvasSteps.find((step) => step.id === canvasSelection);

  return <div className="creator-workspace min-h-dvh bg-[#0b0b0c] text-white lg:h-dvh lg:overflow-hidden">
    <CreatorSidebar activeSection={null} currentProject={project} />
    <nav aria-label="Creator Lab mobile navigation" className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-between border-t border-white/[.07] bg-[#101012] px-4 pb-2 lg:hidden">
      <Link href="/creator" title="Your projects" aria-label="Your projects" className="grid size-11 place-items-center rounded-lg text-white/65 hover:bg-white/[.06] hover:text-white"><FolderOpen className="size-5" /></Link>
      <span className="text-[11px] text-white/45">{activeLabel}</span>
      <Link href="/" title="Back to app" aria-label="Back to app" className="grid size-11 place-items-center rounded-lg text-white/65 hover:bg-white/[.06] hover:text-white"><Home className="size-5" /></Link>
    </nav>

    <main className="flex min-h-dvh w-full flex-col pb-16 lg:h-dvh lg:min-h-0 lg:pl-[250px] lg:pb-0">
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[.07] px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5"><Link href="/creator" className="hidden shrink-0 text-[12px] text-white/40 hover:text-white sm:block">Creator Lab</Link><ChevronRight className="hidden size-3.5 shrink-0 text-white/25 sm:block" /><h1 className="truncate text-[13px] font-medium text-white/85">{project?.title ?? "Your project"}</h1></div>
        <div className="flex shrink-0 items-center gap-2"><span className="hidden rounded-full border border-white/[.09] px-3 py-1.5 text-[11px] text-white/55 lg:inline-flex">{selectedCanvasStep ? `${WORKFLOW_COPY[selectedCanvasStep.kind].label} selected` : "Canvas"}</span><span className="rounded-full border border-white/[.09] px-3 py-1.5 text-[11px] text-white/45">{composingKind ? `Step ${WORKFLOW_ORDER.indexOf(composingKind) + 1} of ${WORKFLOW_ORDER.length}` : "Ready to publish"}</span></div>
      </header>
      {error && <div role="alert" className="mx-5 mt-3 rounded-lg border border-red-300/20 bg-red-300/[.04] px-3 py-2 text-[12px] text-red-200">{error} <button type="button" onClick={() => void reload()} className="ml-2 underline">Retry</button></div>}
      {!project ? <div className="grid flex-1 place-items-center text-[13px] text-white/40">Loading your workspace…</div> : <>
        {completedCount > 0 && <section aria-label="Completed prompts" className="flex shrink-0 items-center gap-3 overflow-x-auto border-b border-white/[.07] bg-[#101011] px-5 py-4 sm:px-8">
          {workflow.completed.map((kind) => {
            const step = workflow.latest[kind]!;
            const active = workflow.preview === kind;
            return <button key={step.id} type="button" onClick={() => { setSelectedKind(kind); setSelectedStepId(step.id); if (!generating) setRevisionKind(null); }} aria-pressed={active} className={`${styles.enter} flex w-[225px] shrink-0 flex-col gap-2 rounded-[14px] border px-4 py-3 text-left transition-colors ${active ? "border-white/25 bg-[#222224]" : "border-white/[.07] bg-[#18181a] hover:border-white/20"}`}>
              <span className="flex w-full items-center gap-2 text-[12px] text-white/75"><MessageSquareText className="size-3.5 text-white/40" />{WORKFLOW_COPY[kind].label}<Check className="ml-auto size-3.5 text-white/45" /></span>
              <span className="line-clamp-2 min-h-8 text-[11px] leading-4 text-white/40">{step.inputJson?.prompt ?? "Your completed prompt"}</span>
            </button>;
          })}
        </section>}

        <div className={`${styles.canvas} flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row`}>
          {!hasResult && composerStage ? <div className="flex min-h-[calc(100dvh-130px)] w-full flex-1 items-center justify-center px-5 py-14 sm:px-8 lg:min-h-0">
            <div className={`${styles.enter} w-full max-w-[660px]`}>
              <div className="mb-8 text-center"><h2 className="mx-auto max-w-[550px] text-[30px] font-medium leading-[1.16] tracking-[-.04em] sm:text-[42px]">{WORKFLOW_COPY.STORY.title}</h2><p className="mx-auto mt-4 max-w-[430px] text-[14px] leading-6 text-white/45">{WORKFLOW_COPY.STORY.hint}</p></div>
              <WorkspaceComposer key={`${projectId}:${composingKind}`} stage={composerStage} projectId={projectId} token={accessToken ?? ""} balance={balance} onSubmitted={submitted} />
              <p className="mt-5 text-center text-[11px] text-white/30">Start with a few sentences. We’ll guide you through the rest.</p>
            </div>
          </div> : <>
            <InfiniteCanvas items={canvasSteps.map((step) => ({ step, content: <StagePreview key={step.id} stage={{ kind: step.kind, step, status: "READY" }} projectTitle={project.title} projectId={projectId} token={accessToken ?? ""} onChanged={() => void reload()} onPublish={setPublishJobId} onRefine={generating ? undefined : () => { setRevisionKind(step.kind); composerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }} /> }))} selectedId={canvasSelection} onSelect={(step) => { setSelectedStepId(step.id); setSelectedKind(step.kind); }} />
            <div className="min-w-0 flex-1 p-5 sm:p-8 lg:hidden">
              {previewStage && <StagePreview key={`${projectId}:${previewStage.step?.id}`} stage={previewStage} projectTitle={project.title} projectId={projectId} token={accessToken ?? ""} onChanged={() => void reload()} onPublish={setPublishJobId} onRefine={generating ? undefined : () => { setRevisionKind(previewStage.kind); composerRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" }); }} />}
            </div>
            <aside ref={composerRef} aria-label="Next step" className="w-full shrink-0 border-t border-white/[.08] bg-[#121213] p-5 sm:p-6 lg:w-[320px] lg:overflow-y-auto lg:border-l lg:border-t-0 xl:w-[360px] 2xl:w-[400px]">
              {composerStage && composingKind ? <div key={composingKind} className={styles.enter}>
                {selectedCanvasStep && <p className="mb-5 hidden text-[11px] text-white/40 lg:block">Selected on canvas · <span className="text-white/70">{WORKFLOW_COPY[selectedCanvasStep.kind].label}</span></p>}
                <div className="mb-6"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/50">{revisionKind ? <RotateCcw className="size-3" /> : <ArrowRight className="size-3" />}{revisionKind ? "Refine" : `Step ${WORKFLOW_ORDER.indexOf(composingKind) + 1}`} · {WORKFLOW_COPY[composingKind].label}</span><h2 className="mt-5 text-[24px] font-medium leading-[1.2] tracking-[-.03em]">{WORKFLOW_COPY[composingKind].title}</h2><p className="mt-3 text-[13px] leading-[1.75] text-white/45">{WORKFLOW_COPY[composingKind].hint}</p></div>
                <WorkspaceComposer key={`${projectId}:${composingKind}:${revisionKind ? "revision" : "next"}`} stage={composerStage} projectId={projectId} token={accessToken ?? ""} balance={balance} onSubmitted={submitted} />
                {revisionKind && !generating && <button type="button" onClick={() => setRevisionKind(null)} className="mt-4 text-[12px] text-white/45 hover:text-white">{workflow.next ? "Back to next step" : "Back to finished film"}</button>}
                {!revisionKind && <div className="mt-6 flex items-start gap-2 text-[11px] leading-5 text-white/35"><Check className="mt-0.5 size-3.5 shrink-0" /><p>Your previous work is saved. Each step builds on what you’ve created.</p></div>}
              </div> : <div className={styles.enter}><span className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/[.04]"><Check className="size-5" /></span><h2 className="mt-5 text-[24px] font-medium tracking-[-.03em]">Your film is ready.</h2><p className="mt-3 text-[13px] leading-6 text-white/45">Review your film in the canvas, or revisit any prompt above to refine your work.</p><button type="button" onClick={() => setSelectedKind("ANIMATION")} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[12px] font-medium text-black">View film<ArrowRight className="size-3.5" /></button></div>}
            </aside>
          </>}
        </div>
      </>}
    </main>
    {publishJobId && project && <PublishDialog jobId={publishJobId} defaultTitle={project.title} token={accessToken ?? ""} onClose={() => setPublishJobId(null)} onPublished={() => { setPublishJobId(null); void reload(); }} />}
  </div>;
}
