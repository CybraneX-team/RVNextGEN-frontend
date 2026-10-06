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

  const stageProps = { projectId, token: accessToken ?? "", balance, onChanged: () => void reload() };

  return (
    <div className="min-h-screen bg-[#0b0c0d] text-white">
      <CreatorHeader balance={balance} />
      <main className="mx-auto max-w-3xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/creator" className="text-[13px] text-white/50 hover:text-white/80">← Projects</Link>
          <span className="text-white/20">/</span>
          <h1 className="text-[20px] font-semibold tracking-[-0.3px]">{project?.title ?? "…"}</h1>
        </div>

        {error && <p role="alert" className="mb-4 text-[13px] text-[#ff8f8f]">{error}</p>}
        {!project ? (
          <p className="text-[13px] text-white/40">Loading…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <StageCard stage={stageOf("STORY")} {...stageProps} />
            <StageCard stage={stageOf("SCREENPLAY")} {...stageProps} />

            <div className="rounded-xl border border-white/8 bg-white/[0.015] p-4">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-white/40">Images</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <StageCard stage={stageOf("CHARACTER")} {...stageProps} />
                <StageCard stage={stageOf("SCENE")} {...stageProps} />
              </div>
            </div>

            <StageCard stage={stageOf("ANIMATION")} {...stageProps} onPublish={(jobId) => setPublishJobId(jobId)} />
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
