"use client";

import { useEffect, useRef, useState } from "react";
import { getContent, type ApiContent, type ContentType } from "@/lib/content";
import { updateContent, uploadPoster } from "@/lib/admin";
import GenrePicker from "./GenrePicker";

const input = "h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-white/30";
const label = "mb-1 block text-[12px] font-medium text-white/55";
const TYPES: ContentType[] = ["MOVIE", "SERIES", "EPISODE", "SHORT"];
const VISIBILITIES = ["PUBLISHED", "DRAFT", "PRIVATE", "ARCHIVED"] as const;

type Fields = { title: string; tagline: string; description: string; posterUrl: string; rating: string; type: ContentType; visibility: (typeof VISIBILITIES)[number] };

/** Edit an existing title: loads it, lets the admin change fields/genre/visibility, saves via PATCH. */
export default function EditContentModal({ id, token, onClose, onSaved }: { id: string; token: string | null; onClose: () => void; onSaved: () => void }) {
  const [item, setItem] = useState<ApiContent | null>(null);
  const [fields, setFields] = useState<Fields | null>(null);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posterInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields((f) => (f ? { ...f, [key]: value } : f));

  useEffect(() => {
    if (!token) return;
    let live = true;
    getContent(id, token).then((c) => {
      if (!live) return;
      setItem(c);
      setFields({ title: c.title, tagline: c.tagline ?? "", description: c.description ?? "", posterUrl: c.posterUrl ?? "", rating: c.rating != null ? String(c.rating) : "", type: c.type, visibility: (c.visibility as Fields["visibility"]) });
      setCategoryIds(c.categories.map((x) => x.id));
    }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Couldn’t load this title."); });
    return () => { live = false; };
  }, [id, token]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!token || !fields || busy) return;
    setBusy(true); setError(null);
    try {
      await updateContent(id, {
        title: fields.title.trim(),
        tagline: fields.tagline.trim(),
        description: fields.description.trim(),
        posterUrl: fields.posterUrl.trim() || undefined,
        rating: fields.rating ? Number(fields.rating) : undefined,
        type: fields.type,
        visibility: fields.visibility,
        categoryIds,
      }, token);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }

  async function choosePoster(file?: File) {
    if (!file || !token || uploadingPoster) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be 5 MB or smaller."); return; }
    setUploadingPoster(true); setError(null);
    try {
      const { url } = await uploadPoster(file, token);
      set("posterUrl", url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload the image.");
    } finally {
      setUploadingPoster(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Edit title" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-[#101314] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-white">Edit title</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-white/5 text-white/70 hover:bg-white/10">✕</button>
        </div>
        {error && <p role="alert" className="mb-3 text-[13px] text-[#ff8f8f]">{error}</p>}
        {!fields ? <p className="py-10 text-center text-white/40">{error ? "" : "Loading…"}</p> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {fields.posterUrl && <img src={fields.posterUrl} alt="" className="aspect-video w-full rounded-lg object-cover" referrerPolicy="no-referrer" />}
              <input ref={posterInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { void choosePoster(e.target.files?.[0]); e.currentTarget.value = ""; }} />
              <button type="button" onClick={() => posterInput.current?.click()} disabled={uploadingPoster} className="mt-2 w-full rounded-md border border-white/15 px-3 py-2 text-[12px] font-medium text-white/75 hover:bg-white/5 disabled:cursor-wait disabled:opacity-50">{uploadingPoster ? "Uploading image…" : "Change image"}</button>
              <p className="mt-2 text-[12px] text-white/40">{item?.source === "YOUTUBE" ? `YouTube · ${item.youtubeId}` : "Cloudflare"}</p>
            </div>
            <div className="flex flex-col gap-3">
              <div><span className={label}>Title</span><input className={input} value={fields.title} onChange={(e) => set("title", e.target.value)} maxLength={300} /></div>
              <div><span className={label}>Tagline</span><input className={input} value={fields.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={300} /></div>
              <div><span className={label}>Description</span><textarea className={`${input} h-20 resize-y py-2`} value={fields.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} /></div>
              <div><span className={label}>Thumbnail URL</span><input className={input} value={fields.posterUrl} onChange={(e) => set("posterUrl", e.target.value)} maxLength={2048} placeholder="Upload an image or paste a URL" /></div>
              <div><span className={label}>Genre</span><GenrePicker value={categoryIds} onChange={setCategoryIds} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><span className={label}>Rating</span><input className={input} type="number" min={0} max={5} step={0.1} value={fields.rating} onChange={(e) => set("rating", e.target.value)} placeholder="0–5" /></div>
                <div><span className={label}>Type</span><select className={input} value={fields.type} onChange={(e) => set("type", e.target.value as ContentType)}>{TYPES.map((t) => <option key={t} value={t} className="bg-[#14171a]">{t}</option>)}</select></div>
                <div><span className={label}>Visibility</span><select className={input} value={fields.visibility} onChange={(e) => set("visibility", e.target.value as Fields["visibility"])}>{VISIBILITIES.map((v) => <option key={v} value={v} className="bg-[#14171a]">{v}</option>)}</select></div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={save} disabled={busy} className="h-11 rounded-lg bg-[#2f7d5b] px-5 text-[14px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button>
                <button type="button" onClick={onClose} className="h-11 rounded-lg border border-white/12 px-4 text-[14px] text-white/70 hover:bg-white/5">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
