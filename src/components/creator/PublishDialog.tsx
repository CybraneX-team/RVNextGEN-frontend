"use client";

import { useEffect, useState } from "react";
import { publishJob, type PublishResult } from "@/lib/creator";

const input = "h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-[#e5b27f]/50";
const label = "mb-1 block text-[12px] font-medium text-white/55";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 340);

/** Publishes the final animation as a DRAFT Content (imported into Cloudflare Stream).
 *  An admin later flips it DRAFT → PUBLISHED from the admin Content tab. */
export default function PublishDialog({ jobId, defaultTitle, token, onClose, onPublished }: { jobId: string; defaultTitle: string; token: string; onClose: () => void; onPublished: () => void }) {
  const [title, setTitle] = useState(defaultTitle);
  const [slug, setSlug] = useState(slugify(defaultTitle));
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (busy) return;
    if (!title.trim()) { setError("A title is required."); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { setError("Slug can use only lowercase letters, numbers and hyphens."); return; }
    setBusy(true); setError(null);
    try {
      const res = await publishJob(jobId, { title: title.trim(), slug, description: description.trim() || undefined, isPremium }, token);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true" aria-label="Publish film" onClick={onClose}>
      <div className="mt-5 w-full max-w-lg rounded-[22px] border border-[#d9a26d]/15 bg-[#171517] p-4 shadow-2xl sm:mt-10 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-white">Publish film</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-white/5 text-white/70 hover:bg-white/10">✕</button>
        </div>

        {result ? (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-[#e7bd94]">Submitted as a draft ✓</p>
            <p className="text-[13px] text-white/60">{result.nextStep}</p>
            <p className="text-[12px] text-white/40">Stream UID: {result.streamUid ?? "pending"}</p>
            <button onClick={onPublished} className="mt-2 h-11 rounded-lg bg-[#e5b27f] px-5 text-[14px] font-semibold text-[#20140c] hover:bg-[#f0c493]">Done</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {error && <p role="alert" className="text-[13px] text-[#ff8f8f]">{error}</p>}
            <div>
              <span className={label}>Title</span>
              <input className={input} value={title} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} maxLength={300} />
            </div>
            <div>
              <span className={label}>Slug</span>
              <input className={input} value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} maxLength={340} />
            </div>
            <div>
              <span className={label}>Description (optional)</span>
              <textarea className={`${input} h-20 resize-y py-2`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
            </div>
            <label className="flex items-center gap-2 text-[13px] text-white/70">
              <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} className="size-4 accent-[#e5b27f]" />
              Premium (paid) title
            </label>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={submit} disabled={busy} className="h-11 rounded-lg bg-[#e5b27f] px-5 text-[14px] font-semibold text-[#20140c] hover:bg-[#f0c493] disabled:opacity-50">{busy ? "Publishing…" : "Publish"}</button>
              <button onClick={onClose} className="h-11 rounded-lg border border-white/12 px-4 text-[14px] text-white/70 hover:bg-white/5">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
