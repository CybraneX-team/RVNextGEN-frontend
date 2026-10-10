"use client";

import { useState } from "react";
import { editStep, runStep, type StageView } from "@/lib/creator";
import { modelsForKind, STAGE_META, type ModelOption } from "@/lib/creator-models";

const input = "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-[14px] leading-5 text-white outline-none placeholder:text-white/35 focus:border-[#e5b27f]/45";
const STAGE_HINT: Record<StageView["kind"], string> = {
  STORY: "Set the world, characters, and central conflict.",
  SCREENPLAY: "Turn the story into scenes and dialogue.",
  CHARACTER: "Create a visual direction for your cast.",
  SCENE: "Design the places and atmosphere of the film.",
  ANIMATION: "Bring the prepared characters and scenes into motion.",
};

function StatusBadge({ status }: { status: StageView["status"] }) {
  const map: Record<StageView["status"], { text: string; cls: string }> = {
    LOCKED: { text: "Locked", cls: "border-white/10 bg-white/[.02] text-white/40" },
    AVAILABLE: { text: "Ready", cls: "border-white/15 bg-white/[.03] text-white/60" },
    GENERATING: { text: "In progress", cls: "border-amber-400/25 bg-amber-400/[.06] text-amber-300" },
    READY: { text: "Complete ✓", cls: "border-[#e5b27f]/25 bg-[#e5b27f]/[.06] text-[#e7bd94]" },
    FAILED: { text: "Failed", cls: "border-red-400/40 text-[#ff8f8f]" },
  };
  const { text, cls } = map[status];
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] leading-none ${cls}`}>{text}</span>;
}

/** One pipeline stage. Handles text (editable), image, and video operations. */
export default function StageCard({
  stage, projectId, token, balance, onChanged, onPublish, index,
}: {
  stage: StageView;
  projectId: string;
  token: string;
  balance: number | null;
  onChanged: () => void;
  onPublish?: (jobId: string) => void;
  index: number;
}) {
  const { kind, status, step } = stage;
  const meta = STAGE_META[kind];
  const models = modelsForKind(kind);
  const operation = meta.operation;
  const isText = operation === "TEXT";

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ModelOption | null>(models[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  const cost = model?.credits ?? 0;
  const tooPoor = balance != null && balance < cost;

  async function generate() {
    if (busy) return;
    if (prompt.trim().length < 3) { setError("Describe what you want in a little more detail."); return; }
    if (!isText && !model) { setError("Pick a model first."); return; }
    setBusy(true); setError(null);
    try {
      await runStep(projectId, kind, { prompt: prompt.trim(), provider: model?.provider, model: model?.model }, token);
      setPrompt("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (busy || !step) return;
    if (editText.trim().length < 1) { setError("Text can't be empty."); return; }
    setBusy(true); setError(null);
    try {
      await editStep(projectId, step.id, editText.trim(), token);
      setEditing(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save edit");
    } finally {
      setBusy(false);
    }
  }

  const outputUrl = step?.generationJob?.outputUrl ?? null;
  const text = step?.outputJson?.text ?? null;
  const showForm = status === "AVAILABLE" || status === "READY" || status === "FAILED";

  return (
    <section className={`rounded-[18px] border p-4 transition-colors sm:p-5 ${status === "LOCKED" ? "border-white/[.07] bg-white/[0.015] opacity-60" : "border-white/[.09] bg-[#171517]"}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl border text-[11px] font-semibold ${status === "READY" ? "border-[#e5b27f]/25 bg-[#e5b27f]/[.08] text-[#e5b27f]" : "border-white/[.08] bg-white/[.03] text-white/45"}`}>{String(index).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h3 className="text-[15px] font-semibold text-white sm:text-[16px]">{meta.label}</h3><StatusBadge status={status} /></div><p className="mt-1 text-[11px] leading-4 text-white/40">{STAGE_HINT[kind]}</p></div>
      </div>

      {status === "LOCKED" && <p className="text-[13px] text-white/40">{stage.lockedReason ?? "Complete the previous step first."}</p>}

      {status === "GENERATING" && (
        <div className="flex items-center gap-2 text-[13px] text-amber-300">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-amber-300/40 border-t-amber-300" />
          {isText ? "Writing…" : "Rendering — this can take a minute or two."}
        </div>
      )}

      {/* Output */}
      {status === "READY" && (
        <div className="mb-4">
          {isText && !editing && text && (
            <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/[.07] bg-black/20 p-3.5 text-[13px] leading-relaxed text-white/80 sm:p-4">{text}</div>
          )}
          {isText && editing && (
            <div>
              <textarea className={`${input} h-48 resize-y`} value={editText} onChange={(e) => setEditText(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <button onClick={saveEdit} disabled={busy} className="rounded-lg bg-[#e5b27f] px-4 py-1.5 text-[13px] font-semibold text-[#20140c] hover:bg-[#f0c493] disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
                <button onClick={() => setEditing(false)} className="rounded-lg border border-white/12 px-4 py-1.5 text-[13px] text-white/70 hover:bg-white/5">Cancel</button>
              </div>
            </div>
          )}
          {operation === "IMAGE" && outputUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={outputUrl} alt={`${meta.label} result`} className="w-full max-w-md rounded-lg border border-white/8" referrerPolicy="no-referrer" />
          )}
          {operation === "VIDEO" && outputUrl && (
            <video src={outputUrl} controls playsInline className="w-full max-w-xl rounded-xl border border-white/[.08] bg-black" />
          )}
          {isText && !editing && text && (
            <button onClick={() => { setEditText(text); setEditing(true); }} className="mt-2 text-[12px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline">Edit text</button>
          )}
          {operation === "VIDEO" && outputUrl && step?.generationJob && onPublish && (
            <div className="mt-3">
              <button onClick={() => onPublish(step.generationJob!.id)} className="rounded-lg bg-[#e5b27f] px-5 py-2 text-[14px] font-semibold text-[#20140c] hover:bg-[#f0c493]">Publish film</button>
            </div>
          )}
        </div>
      )}

      {status === "FAILED" && (
        <p className="mb-3 text-[13px] text-[#ff8f8f]">Generation failed{step?.generationJob?.errorCode ? ` (${step.generationJob.errorCode})` : ""}. Credits were refunded — you can try again.</p>
      )}

      {/* Generate / regenerate form */}
      {showForm && (
        <div className="mt-2">
          <label className="mb-1 block text-[11px] font-medium text-white/45" htmlFor={`prompt-${kind}`}>{status === "READY" ? "Describe what you’d like to change" : `Describe your ${meta.label.toLowerCase()}`}</label>
          <textarea
            id={`prompt-${kind}`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={status === "READY" ? "Describe a new version to regenerate…" : `Describe the ${meta.label.toLowerCase()} you want…`}
            maxLength={4000}
            className={`${input} min-h-28 resize-y sm:min-h-24`}
          />
          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            {models.length > 0 && (
              <select
                value={model?.model ?? ""}
                onChange={(e) => setModel(models.find((m) => m.model === e.target.value) ?? null)}
                aria-label={`${meta.label} generation model`}
                className="h-11 w-full min-w-0 rounded-xl border border-white/10 bg-[#201d1e] px-3 text-[12px] text-white outline-none focus:border-[#e5b27f]/45 sm:w-auto sm:max-w-full sm:flex-1 sm:text-[13px]"
              >
                {models.map((m) => <option key={m.model} value={m.model} className="bg-[#14171a]">{m.label} · {m.credits} cr</option>)}
              </select>
            )}
            <button
              onClick={generate}
              disabled={busy || tooPoor}
              title={tooPoor ? "Not enough credits" : undefined}
              className="h-11 w-full rounded-xl bg-[#e5b27f] px-5 text-[13px] font-semibold text-[#20140c] transition-colors hover:bg-[#f0c493] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-32"
            >
              {busy ? "Working…" : status === "READY" ? "Regenerate" : "Generate"}
            </button>
            {cost > 0 && <span className="text-center text-[11px] text-white/40 sm:text-left">Uses {cost} credit{cost === 1 ? "" : "s"}{tooPoor ? " · not enough credits" : ""}</span>}
          </div>
          {error && <p role="alert" className="mt-2 text-[13px] text-[#ff8f8f]">{error}</p>}
        </div>
      )}
    </section>
  );
}
