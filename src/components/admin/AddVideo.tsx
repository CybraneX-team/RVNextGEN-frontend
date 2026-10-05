"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "../AuthProvider";
import { createYoutube, youtubePreview, type YoutubePreview } from "@/lib/admin";
import type { ContentType } from "@/lib/content";
import GenrePicker from "./GenrePicker";

const input = "h-11 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-white/30";
const label = "mb-1 block text-[12px] font-medium text-white/55";
const TYPES: ContentType[] = ["MOVIE", "SERIES", "EPISODE", "SHORT"];
const VISIBILITIES = ["PUBLISHED", "DRAFT", "PRIVATE"] as const;

type Fields = { title: string; tagline: string; description: string; posterUrl: string; rating: string; type: ContentType; visibility: (typeof VISIBILITIES)[number] };
const EMPTY: Fields = { title: "", tagline: "", description: "", posterUrl: "", rating: "", type: "MOVIE", visibility: "PUBLISHED" };

export default function AddVideo({ onCreated }: { onCreated?: () => void }) {
  const { accessToken } = useAuth();
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<YoutubePreview | null>(null);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [busy, setBusy] = useState<false | "fetch" | "save">(false);
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields((f) => ({ ...f, [key]: value }));

  async function fetchMeta(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || busy) return;
    setBusy("fetch"); setNotice(null);
    try {
      const meta = await youtubePreview(url.trim(), accessToken);
      setPreview(meta);
      setFields((f) => ({ ...f, title: meta.title, description: meta.description ?? "", posterUrl: meta.posterUrl }));
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not fetch that video." });
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || busy) return;
    setBusy("save"); setNotice(null);
    try {
      const created = await createYoutube({
        url: url.trim(),
        title: fields.title.trim() || undefined,
        tagline: fields.tagline.trim() || undefined,
        description: fields.description.trim() || undefined,
        posterUrl: fields.posterUrl.trim() || undefined,
        rating: fields.rating ? Number(fields.rating) : undefined,
        type: fields.type,
        visibility: fields.visibility,
        categoryIds,
      }, accessToken);
      setNotice({ tone: "ok", text: `Saved “${created.title}” — now ${created.visibility.toLowerCase()}.` });
      setPreview(null); setUrl(""); setFields(EMPTY); setCategoryIds([]);
      onCreated?.();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not save this video." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-[20px] font-semibold text-white">Add a YouTube video</h2>
      <p className="mt-1 text-[13px] text-white/50">Paste a link — we pull the title, thumbnail and description from YouTube. Edit anything, then save.</p>

      <form onSubmit={fetchMeta} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input className={input} type="url" required placeholder="https://www.youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="submit" disabled={!!busy || !url.trim()} className="h-11 shrink-0 rounded-lg bg-white px-5 text-[14px] font-semibold text-[#0e0d0f] hover:bg-white/90 disabled:opacity-50">{busy === "fetch" ? "Fetching…" : "Fetch"}</button>
      </form>

      {preview && (
        <form onSubmit={save} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fields.posterUrl || preview.posterUrl} alt="" className="aspect-video w-full rounded-lg object-cover" referrerPolicy="no-referrer" />
            {preview.channel && <p className="mt-2 text-[12px] text-white/45">From {preview.channel}</p>}
            {preview.durationSecs != null && <p className="text-[12px] text-white/45">{Math.round(preview.durationSecs / 60)} min</p>}
          </div>
          <div className="flex flex-col gap-3">
            <div><span className={label}>Title</span><input className={input} value={fields.title} onChange={(e) => set("title", e.target.value)} maxLength={300} required /></div>
            <div><span className={label}>Tagline</span><input className={input} value={fields.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={300} placeholder="Optional one-liner" /></div>
            <div><span className={label}>Description</span><textarea className={`${input} h-24 resize-y py-2`} value={fields.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} /></div>
            <div><span className={label}>Thumbnail URL</span><input className={input} value={fields.posterUrl} onChange={(e) => set("posterUrl", e.target.value)} maxLength={2048} /></div>
            <div><span className={label}>Genre</span><GenrePicker value={categoryIds} onChange={setCategoryIds} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><span className={label}>Rating</span><input className={input} type="number" min={0} max={5} step={0.1} value={fields.rating} onChange={(e) => set("rating", e.target.value)} placeholder="0–5" /></div>
              <div><span className={label}>Type</span><select className={input} value={fields.type} onChange={(e) => set("type", e.target.value as ContentType)}>{TYPES.map((t) => <option key={t} value={t} className="bg-[#14171a]">{t}</option>)}</select></div>
              <div><span className={label}>Visibility</span><select className={input} value={fields.visibility} onChange={(e) => set("visibility", e.target.value as Fields["visibility"])}>{VISIBILITIES.map((v) => <option key={v} value={v} className="bg-[#14171a]">{v}</option>)}</select></div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={!!busy} className="h-11 rounded-lg bg-[#2f7d5b] px-5 text-[14px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50">{busy === "save" ? "Saving…" : "Save video"}</button>
              <button type="button" onClick={() => { setPreview(null); setFields(EMPTY); setCategoryIds([]); }} className="h-11 rounded-lg border border-white/12 px-4 text-[14px] text-white/70 hover:bg-white/5">Cancel</button>
            </div>
          </div>
        </form>
      )}

      {notice && <p role={notice.tone === "error" ? "alert" : "status"} className={`mt-4 text-[13px] ${notice.tone === "error" ? "text-[#ff8f8f]" : "text-[#8fe3b4]"}`}>{notice.text}</p>}

      <p className="mt-8 border-t border-white/8 pt-4 text-[13px] text-white/40">Cloudflare upload (direct file / series) is coming in a later step.</p>
    </div>
  );
}
