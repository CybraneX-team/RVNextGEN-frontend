"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../AuthProvider";
import {
  createCloudflare, createUploadUrl, updateContent, uploadPoster, uploadVideoFile, videoStatus,
  type StreamUrls, type VideoStatus,
} from "@/lib/admin";
import type { ContentType } from "@/lib/content";
import GenrePicker from "./GenrePicker";

const input = "h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-white/30";
const label = "mb-1 block text-[12px] font-medium text-white/55";
const TYPES: ContentType[] = ["MOVIE", "SERIES", "EPISODE", "SHORT"];

type Fields = { title: string; tagline: string; description: string; posterUrl: string; rating: string; type: ContentType; isPremium: boolean };
const EMPTY: Fields = { title: "", tagline: "", description: "", posterUrl: "", rating: "", type: "MOVIE", isPremium: false };

type Mode = "url" | "file";
type Stage = "form" | "processing" | "ready";

/** Copy-to-clipboard button for a single URL/value. */
function CopyField({ caption, value }: { caption: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <span className="mb-0.5 block text-[11px] text-white/45">{caption}</span>
        <code className="block truncate rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white/80">{value}</code>
      </div>
      <button
        type="button"
        onClick={() => { void navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
        className="mt-4 shrink-0 rounded-md border border-white/15 px-3 py-1.5 text-[12px] font-medium text-white/80 hover:bg-white/10"
      >{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}

export default function CloudflareUpload({ onCreated }: { onCreated?: () => void }) {
  const { accessToken } = useAuth();
  const [mode, setMode] = useState<Mode>("url");
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("form");
  const [contentId, setContentId] = useState<string | null>(null);
  const [status, setStatus] = useState<VideoStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const posterInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields((f) => ({ ...f, [key]: value }));

  // Poll Cloudflare encoding status while a video is processing.
  useEffect(() => {
    if (stage !== "processing" || !contentId || !accessToken) return;
    let live = true;
    const tick = async () => {
      try {
        const s = await videoStatus(contentId, accessToken);
        if (!live) return;
        setStatus(s);
        if (s.ready) { setStage("ready"); setNotice({ tone: "ok", text: "Video is ready. Copy the link or publish it." }); }
        else if (s.state === "error") { setStage("form"); setNotice({ tone: "error", text: `Cloudflare could not process this video (${s.errorCode ?? "error"}).` }); }
      } catch { /* transient — keep polling */ }
    };
    void tick();
    const id = setInterval(() => void tick(), 4000);
    return () => { live = false; clearInterval(id); };
  }, [stage, contentId, accessToken]);

  function reset() {
    setFields(EMPTY); setCategoryIds([]); setSourceUrl(""); setFile(null);
    setStage("form"); setContentId(null); setStatus(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || busy) return;
    if (mode === "url" && !sourceUrl.trim()) { setNotice({ tone: "error", text: "Paste a video URL." }); return; }
    if (mode === "file" && !file) { setNotice({ tone: "error", text: "Choose a video file." }); return; }
    setBusy(true); setNotice(null);
    try {
      const created = await createCloudflare({
        title: fields.title.trim(),
        tagline: fields.tagline.trim() || undefined,
        description: fields.description.trim() || undefined,
        posterUrl: fields.posterUrl.trim() || undefined,
        rating: fields.rating ? Number(fields.rating) : undefined,
        type: fields.type,
        isPremium: fields.isPremium,
        sourceUrl: mode === "url" ? sourceUrl.trim() : undefined,
        categoryIds,
      }, accessToken);
      setContentId(created.id);
      if (mode === "file" && file) {
        const { uploadUrl } = await createUploadUrl(created.id, accessToken, fields.title.trim() || undefined);
        await uploadVideoFile(uploadUrl, file);
      }
      setStage("processing");
      setNotice({ tone: "ok", text: "Saved as a draft. Cloudflare is processing the video…" });
      onCreated?.();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not save this video." });
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!accessToken || !contentId || publishing) return;
    setPublishing(true); setNotice(null);
    try {
      await updateContent(contentId, { visibility: "PUBLISHED" }, accessToken);
      setNotice({ tone: "ok", text: "Published. It's now live." });
      onCreated?.();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not publish." });
    } finally {
      setPublishing(false);
    }
  }

  async function choosePoster(f?: File) {
    if (!f || !accessToken || uploadingPoster) return;
    if (!f.type.startsWith("image/")) { setNotice({ tone: "error", text: "Choose an image file." }); return; }
    if (f.size > 5 * 1024 * 1024) { setNotice({ tone: "error", text: "Image must be 5 MB or smaller." }); return; }
    setUploadingPoster(true); setNotice(null);
    try {
      const { url } = await uploadPoster(f, accessToken);
      set("posterUrl", url);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not upload the image." });
    } finally {
      setUploadingPoster(false);
    }
  }

  const urls: StreamUrls | null = status?.urls ?? null;

  return (
    <div className="max-w-3xl">
      <h2 className="text-[20px] font-semibold text-white">Add a Cloudflare video</h2>
      <p className="mt-1 text-[13px] text-white/50">Enter the details and either paste a video URL or upload a file. It&apos;s copied to Cloudflare Stream, then you can copy its CDN link or publish it.</p>

      {stage !== "ready" && (
        <form onSubmit={save} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {fields.posterUrl ? <img src={fields.posterUrl} alt="" className="aspect-video w-full rounded-lg object-cover" referrerPolicy="no-referrer" /> : <div className="grid aspect-video w-full place-items-center rounded-lg border border-dashed border-white/15 text-[12px] text-white/35">No poster</div>}
            <input ref={posterInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { void choosePoster(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            <button type="button" onClick={() => posterInput.current?.click()} disabled={uploadingPoster || stage === "processing"} className="mt-2 w-full rounded-md border border-white/15 px-3 py-2 text-[12px] font-medium text-white/75 hover:bg-white/5 disabled:cursor-wait disabled:opacity-50">{uploadingPoster ? "Uploading image…" : "Upload poster"}</button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit rounded-lg border border-white/12 p-0.5">
              {(["url", "file"] as Mode[]).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} disabled={stage === "processing"} className={`rounded-md px-3 py-1.5 text-[13px] font-medium disabled:opacity-50 ${mode === m ? "bg-white text-[#0e0d0f]" : "text-white/60 hover:text-white/90"}`}>{m === "url" ? "Paste URL" : "Upload file"}</button>
              ))}
            </div>
            {mode === "url"
              ? <div><span className={label}>Video URL</span><input className={input} type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} maxLength={2048} placeholder="https://…/movie.mp4" disabled={stage === "processing"} /></div>
              : <div>
                  <span className={label}>Video file</span>
                  <input ref={videoInput} type="file" accept="video/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); }} />
                  <button type="button" onClick={() => videoInput.current?.click()} disabled={stage === "processing"} className="h-11 w-full rounded-lg border border-white/15 px-3 text-left text-[14px] text-white/75 hover:bg-white/5 disabled:opacity-50">{file ? file.name : "Choose a video file…"}</button>
                </div>}
            <div><span className={label}>Title</span><input className={input} value={fields.title} onChange={(e) => set("title", e.target.value)} maxLength={300} required disabled={stage === "processing"} /></div>
            <div><span className={label}>Tagline</span><input className={input} value={fields.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={300} placeholder="Optional one-liner" disabled={stage === "processing"} /></div>
            <div><span className={label}>Description</span><textarea className={`${input} h-24 resize-y py-2`} value={fields.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} disabled={stage === "processing"} /></div>
            <div><span className={label}>Genre</span><GenrePicker value={categoryIds} onChange={setCategoryIds} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><span className={label}>Rating</span><input className={input} type="number" min={0} max={5} step={0.1} value={fields.rating} onChange={(e) => set("rating", e.target.value)} placeholder="0–5" disabled={stage === "processing"} /></div>
              <div><span className={label}>Type</span><select className={input} value={fields.type} onChange={(e) => set("type", e.target.value as ContentType)} disabled={stage === "processing"}>{TYPES.map((t) => <option key={t} value={t} className="bg-[#14171a]">{t}</option>)}</select></div>
              <label className="flex items-end gap-2 pb-2.5"><input type="checkbox" checked={fields.isPremium} onChange={(e) => set("isPremium", e.target.checked)} disabled={stage === "processing"} className="size-4 accent-[#2f7d5b]" /><span className="text-[13px] text-white/70">Premium</span></label>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={busy || uploadingPoster || stage === "processing" || !fields.title.trim()} className="h-11 rounded-lg bg-[#2f7d5b] px-5 text-[14px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50">{busy ? "Saving…" : stage === "processing" ? "Processing…" : "Save & upload"}</button>
              {stage === "processing" && <span className="text-[13px] text-white/55">Cloudflare state: {status?.state ?? "queued"} — this can take a few minutes.</span>}
              {stage === "form" && <button type="button" onClick={reset} className="h-11 rounded-lg border border-white/12 px-4 text-[14px] text-white/70 hover:bg-white/5">Clear</button>}
            </div>
          </div>
        </form>
      )}

      {stage === "ready" && urls && (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-[16px] font-semibold text-white">“{fields.title}” is ready</h3>
          <p className="mt-1 text-[13px] text-white/50">{fields.isPremium ? "Premium — playback is token-protected; these are the Cloudflare identifiers." : "Non-premium — these CDN links play anywhere."}</p>
          <div className="mt-4 flex flex-col gap-3">
            <CopyField caption="Stream UID" value={urls.uid} />
            <CopyField caption="HLS manifest (CDN)" value={urls.hls} />
            <CopyField caption="Embed / iframe" value={urls.iframe} />
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button type="button" onClick={publish} disabled={publishing} className="h-11 rounded-lg bg-[#2f7d5b] px-5 text-[14px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50">{publishing ? "Publishing…" : "Publish now"}</button>
            <button type="button" onClick={reset} className="h-11 rounded-lg border border-white/12 px-4 text-[14px] text-white/70 hover:bg-white/5">Add another</button>
          </div>
        </div>
      )}

      {notice && <p role={notice.tone === "error" ? "alert" : "status"} className={`mt-4 text-[13px] ${notice.tone === "error" ? "text-[#ff8f8f]" : "text-[#8fe3b4]"}`}>{notice.text}</p>}

      <p className="mt-8 border-t border-white/8 pt-4 text-[13px] text-white/40">Videos are stored on Cloudflare Stream and delivered over its CDN. Posters use Cloudflare R2.</p>
    </div>
  );
}
