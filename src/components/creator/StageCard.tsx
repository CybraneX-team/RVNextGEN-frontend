"use client";

import { useState } from "react";
import { editStep, runStep, type StageView } from "@/lib/creator";
import { modelsForKind, STAGE_META, type ModelOption } from "@/lib/creator-models";

const input = "w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-white/30";

function StatusBadge({ status }: { status: StageView["status"] }) {
  const map: Record<StageView["status"], { text: string; cls: string }> = {
    LOCKED: { text: "Locked", cls: "border-white/10 text-white/40" },
    AVAILABLE: { text: "Ready to generate", cls: "border-white/15 text-white/60" },
    GENERATING: { text: "Generating…", cls: "border-amber-400/40 text-amber-300" },
    READY: { text: "Locked in ✓", cls: "border-[#2f7d5b]/50 text-[#9fe0c4]" },
    FAILED: { text: "Failed", cls: "border-red-400/40 text-[#ff8f8f]" },
  };
  const { text, cls } = map[status];
  return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${cls}`}>{text}</span>;
}

/** One pipeline stage. Handles text (editable), image, and video operations. */
export default function StageCard({
  stage, projectId, token, balance, onChanged, onPublish,
}: {
  stage: StageView;
  projectId: string;
  token: string;
  balance: number | null;
  onChanged: () => void;
  onPublish?: (jobId: string) => void;
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
    <section className={`rounded-xl border p-5 transition-colors ${status === "LOCKED" ? "border-white/8 bg-white/[0.015] opacity-60" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-semibold text-white">{meta.label}</h3>
        <StatusBadge status={status} />
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
            <div className="whitespace-pre-wrap rounded-lg border border-white/8 bg-black/20 p-3 text-[13px] leading-relaxed text-white/85">{text}</div>
          )}
          {isText && editing && (
            <div>
              <textarea className={`${input} h-48 resize-y`} value={editText} onChange={(e) => setEditText(e.target.value)} />
              <div className="mt-2 flex gap-2">
                <button onClick={saveEdit} disabled={busy} className="rounded-lg bg-[#2f7d5b] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
                <button onClick={() => setEditing(false)} className="rounded-lg border border-white/12 px-4 py-1.5 text-[13px] text-white/70 hover:bg-white/5">Cancel</button>
              </div>
            </div>
          )}
          {operation === "IMAGE" && outputUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={outputUrl} alt={`${meta.label} result`} className="w-full max-w-md rounded-lg border border-white/8" referrerPolicy="no-referrer" />
          )}
          {operation === "VIDEO" && outputUrl && (
            <video src={outputUrl} controls className="w-full max-w-xl rounded-lg border border-white/8" />
          )}
          {isText && !editing && text && (
            <button onClick={() => { setEditText(text); setEditing(true); }} className="mt-2 text-[12px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline">Edit text</button>
          )}
          {operation === "VIDEO" && outputUrl && step?.generationJob && onPublish && (
            <div className="mt-3">
              <button onClick={() => onPublish(step.generationJob!.id)} className="rounded-lg bg-[#2f7d5b] px-5 py-2 text-[14px] font-semibold text-white hover:bg-[#2a704f]">Publish film</button>
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
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={status === "READY" ? "Describe a new version to regenerate…" : `Describe the ${meta.label.toLowerCase()} you want…`}
            maxLength={4000}
            className={`${input} h-24 resize-y`}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {models.length > 0 && (
              <select
                value={model?.model ?? ""}
                onChange={(e) => setModel(models.find((m) => m.model === e.target.value) ?? null)}
                className="h-10 rounded-lg border border-white/12 bg-white/[0.04] px-2 text-[13px] text-white outline-none focus:border-white/30"
              >
                {models.map((m) => <option key={m.model} value={m.model} className="bg-[#14171a]">{m.label} · {m.credits} cr</option>)}
              </select>
            )}
            <button
              onClick={generate}
              disabled={busy || tooPoor}
              title={tooPoor ? "Not enough credits" : undefined}
              className="h-10 rounded-lg bg-[#2f7d5b] px-5 text-[14px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50"
            >
              {busy ? "Working…" : status === "READY" ? "Regenerate" : "Generate"}
            </button>
            {cost > 0 && <span className="text-[12px] text-white/40">{cost} credit{cost === 1 ? "" : "s"}{tooPoor ? " · insufficient balance" : ""}</span>}
          </div>
          {error && <p role="alert" className="mt-2 text-[13px] text-[#ff8f8f]">{error}</p>}
        </div>
      )}
    </section>
  );
}
