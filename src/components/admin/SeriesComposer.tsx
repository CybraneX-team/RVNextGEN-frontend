"use client";

import { useEffect, useRef, useState } from "react";
import {
  createCloudflare, createSeries, createUploadUrl, createYoutube, deleteContent,
  listSeriesAdmin, seriesEpisodes, updateContent, uploadPoster, uploadVideoFile,
  type AdminSeries, type SeriesTree,
} from "@/lib/admin";
import type { ApiContent } from "@/lib/content";
import GenrePicker from "./GenrePicker";
import EditContentModal from "./EditContentModal";

type Source = "youtube" | "cloudflare";

const input = "h-10 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-white/30";
const label = "mb-1 block text-[12px] font-medium text-white/55";
const btnPrimary = "h-10 rounded-lg bg-[#2f7d5b] px-4 text-[13px] font-semibold text-white hover:bg-[#2a704f] disabled:opacity-50";
const btnGhost = "h-10 rounded-lg border border-white/12 px-3 text-[13px] text-white/70 hover:bg-white/5";

/** Add one episode to a series + season, using this composer's source (YouTube or Cloudflare). */
function AddEpisodeForm({ source, seriesId, seasonNumber, nextEpisodeNumber, token, onAdded, onCancel }: {
  source: Source; seriesId: string; seasonNumber: number; nextEpisodeNumber: number; token: string;
  onAdded: () => void; onCancel: () => void;
}) {
  const [cfMode, setCfMode] = useState<"url" | "file">("url");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [posterUrl, setPosterUrl] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState(String(nextEpisodeNumber));
  const [busy, setBusy] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);

  async function choosePoster(f?: File) {
    if (!f || uploadingPoster) return;
    if (!f.type.startsWith("image/")) { setError("Choose an image file."); return; }
    setUploadingPoster(true); setError(null);
    try { const { url: uploaded } = await uploadPoster(f, token); setPosterUrl(uploaded); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not upload the image."); }
    finally { setUploadingPoster(false); }
  }

  async function add() {
    const epNum = Number(episodeNumber);
    if (!Number.isInteger(epNum) || epNum <= 0) { setError("Episode number must be a whole number > 0"); return; }
    if (source === "youtube" && !url.trim()) { setError("Paste a YouTube URL"); return; }
    if (source === "cloudflare" && cfMode === "url" && !url.trim()) { setError("Paste a video URL"); return; }
    if (source === "cloudflare" && cfMode === "file" && !file) { setError("Choose a video file"); return; }
    setBusy(true); setError(null);
    try {
      const common = { seriesId, seasonNumber, episodeNumber: epNum, type: "EPISODE" as const, posterUrl: posterUrl.trim() || undefined };
      if (source === "youtube") {
        await createYoutube({ url: url.trim(), title: title.trim() || undefined, ...common }, token);
      } else {
        const created = await createCloudflare({
          title: title.trim() || `Episode ${epNum}`,
          sourceUrl: cfMode === "url" ? url.trim() : undefined, ...common,
        }, token);
        if (cfMode === "file" && file) {
          const { uploadUrl } = await createUploadUrl(created.id, token, title.trim() || undefined);
          await uploadVideoFile(uploadUrl, file);
        }
      }
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the episode.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3">
      {source === "cloudflare" && (
        <div className="mb-2 inline-flex rounded-lg border border-white/12 p-0.5">
          {(["url", "file"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setCfMode(m)} className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${cfMode === m ? "bg-white text-[#0e0d0f]" : "text-white/60 hover:text-white/90"}`}>{m === "url" ? "Paste URL" : "Upload file"}</button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[80px_1fr] gap-2">
        <div><span className={label}>Ep #</span><input className={input} type="number" min={1} value={episodeNumber} onChange={(e) => setEpisodeNumber(e.target.value)} /></div>
        <div><span className={label}>Title</span><input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} placeholder={source === "youtube" ? "Optional — pulled from YouTube" : "Episode title"} /></div>
      </div>
      <div className="mt-2">
        {source === "cloudflare" && cfMode === "file" ? (
          <>
            <span className={label}>Video file</span>
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileRef.current?.click()} className="h-10 w-full rounded-lg border border-white/15 px-3 text-left text-[13px] text-white/75 hover:bg-white/5">{file ? file.name : "Choose a video file…"}</button>
          </>
        ) : (
          <>
            <span className={label}>{source === "youtube" ? "YouTube URL" : "Video URL"}</span>
            <input className={input} type="url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2048} placeholder={source === "youtube" ? "https://youtu.be/…" : "https://…/episode.mp4"} />
          </>
        )}
      </div>
      <div className="mt-2">
        <span className={label}>Episode image{source === "youtube" ? " (optional — defaults to the YouTube thumbnail)" : ""}</span>
        <div className="flex items-center gap-3">
          {posterUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={posterUrl} alt="" className="h-12 w-20 rounded-md object-cover" referrerPolicy="no-referrer" />
            : <div className="grid h-12 w-20 place-items-center rounded-md border border-dashed border-white/15 text-[11px] text-white/35">None</div>}
          <input ref={posterRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void choosePoster(e.target.files?.[0]); e.currentTarget.value = ""; }} />
          <button type="button" onClick={() => posterRef.current?.click()} disabled={uploadingPoster} className={btnGhost}>{uploadingPoster ? "Uploading…" : "Upload image"}</button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-[12px] text-[#ff8f8f]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={add} disabled={busy || uploadingPoster} className={btnPrimary}>{busy ? "Adding…" : "Add episode"}</button>
        <button type="button" onClick={onCancel} className={btnGhost}>Cancel</button>
      </div>
      {source === "cloudflare" && <p className="mt-2 text-[12px] text-white/40">Cloudflare episodes start as a draft while the video encodes — publish from the row once it&apos;s ready.</p>}
    </div>
  );
}

/** One episode row with Edit / Delete and (for drafts) Publish. */
function EpisodeRow({ ep, token, onChanged, onEdit }: { ep: ApiContent; token: string; onChanged: () => void; onEdit: (id: string) => void }) {
  const [busy, setBusy] = useState<false | "del" | "pub">(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy("del"); setError(null);
    try { await deleteContent(ep.id, token); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete"); setBusy(false); setArmed(false); }
  }
  async function publish() {
    setBusy("pub"); setError(null);
    try { await updateContent(ep.id, { visibility: "PUBLISHED" }, token); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not publish"); setBusy(false); }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-white/5 px-3 py-2 text-[13px]">
      <span className="w-8 shrink-0 text-white/45">E{ep.episodeNumber ?? "—"}</span>
      <span className="min-w-0 flex-1 truncate text-white/85">{ep.title}</span>
      <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/55">{ep.source}</span>
      <span className={`shrink-0 text-[11px] ${ep.visibility === "PUBLISHED" ? "text-[#8fe3b4]" : "text-white/45"}`}>{ep.visibility}</span>
      <div className="flex shrink-0 gap-1.5">
        {ep.visibility !== "PUBLISHED" && <button onClick={publish} disabled={!!busy} className="rounded-md border border-[#63b58b]/50 px-2.5 py-1 text-[12px] text-[#a9e2be] hover:bg-[#2f7d5b]/25 disabled:opacity-50">{busy === "pub" ? "…" : "Publish"}</button>}
        <button onClick={() => onEdit(ep.id)} className="rounded-md border border-white/15 px-2.5 py-1 text-[12px] text-white/80 hover:bg-white/10">Edit</button>
        {armed
          ? <><button onClick={remove} disabled={!!busy} className="rounded-md bg-[#8f2f2f] px-2.5 py-1 text-[12px] font-medium text-white hover:bg-[#7a2929] disabled:opacity-50">{busy === "del" ? "…" : "Confirm"}</button><button onClick={() => setArmed(false)} className="rounded-md border border-white/15 px-2.5 py-1 text-[12px] text-white/70 hover:bg-white/10">✕</button></>
          : <button onClick={() => setArmed(true)} className="rounded-md border border-[#8f2f2f]/50 px-2.5 py-1 text-[12px] text-[#ff9f9f] hover:bg-[#8f2f2f]/20">Delete</button>}
      </div>
      {error && <span role="alert" className="w-full text-[11px] text-[#ff8f8f]">{error}</span>}
    </div>
  );
}

/** Inline "new series" form (name, poster, genre). */
function CreateSeriesForm({ token, onCreated, onCancel }: { token: string; onCreated: (id: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posterRef = useRef<HTMLInputElement>(null);

  async function choosePoster(f?: File) {
    if (!f || uploading) return;
    if (!f.type.startsWith("image/")) { setError("Choose an image file."); return; }
    setUploading(true); setError(null);
    try { const { url } = await uploadPoster(f, token); setPosterUrl(url); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not upload image"); }
    finally { setUploading(false); }
  }
  async function save() {
    if (!title.trim()) { setError("Title is required"); return; }
    setBusy(true); setError(null);
    try {
      const created = await createSeries({ title: title.trim(), description: description.trim() || undefined, posterUrl: posterUrl.trim() || undefined, categoryIds }, token);
      onCreated(created.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create series"); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-[15px] font-semibold text-white">New series</h3>
      <div className="flex flex-col gap-3">
        <div><span className={label}>Series name</span><input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} placeholder="e.g. Lock & Key" /></div>
        <div><span className={label}>Description</span><textarea className={`${input} h-20 resize-y py-2`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} /></div>
        <div>
          <span className={label}>Series image</span>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {posterUrl ? <img src={posterUrl} alt="" className="h-16 w-28 rounded-md object-cover" /> : <div className="grid h-16 w-28 place-items-center rounded-md border border-dashed border-white/15 text-[11px] text-white/35">None</div>}
            <input ref={posterRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void choosePoster(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            <button type="button" onClick={() => posterRef.current?.click()} disabled={uploading} className={btnGhost}>{uploading ? "Uploading…" : "Upload image"}</button>
          </div>
        </div>
        <div><span className={label}>Genre</span><GenrePicker value={categoryIds} onChange={setCategoryIds} /></div>
        {error && <p role="alert" className="text-[12px] text-[#ff8f8f]">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={busy || uploading} className={btnPrimary}>{busy ? "Creating…" : "Create series"}</button>
          <button type="button" onClick={onCancel} className={btnGhost}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Series mode for an add form: pick an existing series (or create one), then build its
 * seasons and add episodes — all using `source` (YouTube or Cloudflare).
 */
export default function SeriesComposer({ token, source }: { token: string; source: Source }) {
  const [list, setList] = useState<AdminSeries[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tree, setTree] = useState<SeriesTree | null>(null);
  const [creating, setCreating] = useState(false);
  const [addingToSeason, setAddingToSeason] = useState<number | null>(null);
  const [extraSeasons, setExtraSeasons] = useState<number[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [delArmed, setDelArmed] = useState(false);

  function reloadList() { listSeriesAdmin(token).then(setList).catch((e) => setError(e instanceof Error ? e.message : "Failed to load series")); }
  function reloadTree(id: string) { seriesEpisodes(id, token).then(setTree).catch((e) => setError(e instanceof Error ? e.message : "Failed to load episodes")); }

  useEffect(() => {
    reloadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => {
    if (!selectedId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the view before fetching the selected series
    setTree(null); setExtraSeasons([]);
    reloadTree(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function refresh() { reloadList(); if (selectedId) reloadTree(selectedId); }

  async function deleteSeries() {
    if (!selectedId) return;
    try { await deleteContent(selectedId, token); setSelectedId(null); setTree(null); setDelArmed(false); reloadList(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete series"); }
  }

  const combined = [...new Set([...(tree?.seasons.map((s) => s.seasonNumber) ?? []), ...extraSeasons])];
  // Always show at least Season 1 so a brand-new series immediately offers "+ Add episode".
  const seasonNumbers = (combined.length ? combined : [1]).sort((a, b) => a - b);
  const maxSeason = Math.max(...seasonNumbers);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <span className={label}>Series</span>
          <select className={input} value={selectedId ?? ""} onChange={(e) => { setCreating(false); setSelectedId(e.target.value || null); }}>
            <option value="" className="bg-[#14171a]">— Select a series —</option>
            {list?.map((s) => <option key={s.id} value={s.id} className="bg-[#14171a]">{s.title} ({s.episodeCount})</option>)}
          </select>
        </div>
        <button type="button" onClick={() => { setCreating(true); setSelectedId(null); }} className={btnGhost}>+ New series</button>
        {error && <p role="alert" className="w-full text-[12px] text-[#ff8f8f]">{error}</p>}
      </div>

      <div className="mt-4">
        {creating ? <CreateSeriesForm token={token} onCreated={(id) => { setCreating(false); reloadList(); setSelectedId(id); }} onCancel={() => setCreating(false)} />
          : !selectedId ? <p className="text-[13px] text-white/45">Pick a series to add episodes to, or create a new one. Episodes you add here use {source === "youtube" ? "YouTube" : "Cloudflare"}.</p>
          : !tree ? <p className="text-[13px] text-white/40">Loading…</p>
          : (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {tree.series.posterUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tree.series.posterUrl} alt="" className="h-12 w-20 rounded-md object-cover" />
                  </>
                ) : null}
                <h2 className="text-[18px] font-semibold text-white">{tree.series.title}</h2>
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/55">{tree.series.visibility}</span>
                <div className="ml-auto flex gap-2">
                  <button onClick={refresh} className={btnGhost}>Refresh</button>
                  {delArmed
                    ? <><button onClick={deleteSeries} className="h-10 rounded-lg bg-[#8f2f2f] px-3 text-[13px] font-medium text-white hover:bg-[#7a2929]">Confirm delete</button><button onClick={() => setDelArmed(false)} className={btnGhost}>Cancel</button></>
                    : <button onClick={() => setDelArmed(true)} className="h-10 rounded-lg border border-[#8f2f2f]/50 px-3 text-[13px] text-[#ff9f9f] hover:bg-[#8f2f2f]/20">Delete series</button>}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {seasonNumbers.map((num) => {
                  const season = tree.seasons.find((s) => s.seasonNumber === num);
                  const episodes = season?.episodes ?? [];
                  const nextEp = episodes.reduce((m, e) => Math.max(m, e.episodeNumber ?? 0), 0) + 1;
                  return (
                    <div key={num} className="rounded-xl border border-white/8">
                      <div className="flex items-center justify-between px-3 py-2">
                        <h3 className="text-[14px] font-semibold text-white">Season {num}</h3>
                        <button onClick={() => setAddingToSeason(addingToSeason === num ? null : num)} className="rounded-md border border-white/15 px-2.5 py-1 text-[12px] text-white/80 hover:bg-white/10">{addingToSeason === num ? "Close" : "+ Add episode"}</button>
                      </div>
                      {episodes.length === 0 && addingToSeason !== num && <p className="px-3 pb-3 text-[12px] text-white/40">No episodes in this season yet.</p>}
                      {episodes.map((ep) => <EpisodeRow key={ep.id} ep={ep} token={token} onChanged={refresh} onEdit={setEditId} />)}
                      {addingToSeason === num && <div className="p-3 pt-0"><AddEpisodeForm source={source} seriesId={selectedId} seasonNumber={num} nextEpisodeNumber={nextEp} token={token} onAdded={() => { setAddingToSeason(null); refresh(); }} onCancel={() => setAddingToSeason(null)} /></div>}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => { const next = maxSeason + 1; setExtraSeasons((s) => [...s, next]); setAddingToSeason(next); }} className="mt-4 rounded-lg border border-white/15 px-4 py-2 text-[13px] font-medium text-white/80 hover:bg-white/10">+ Add season {maxSeason + 1}</button>
            </div>
          )}
      </div>

      {editId && <EditContentModal id={editId} token={token} onClose={() => setEditId(null)} onSaved={refresh} />}
    </div>
  );
}
