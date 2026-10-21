"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client";
import { createPlayback, type ApiContent, type Playback } from "@/lib/content";
import { ApiError } from "@/lib/api";
import { getDeviceId } from "@/lib/device";
import { useAuth } from "./AuthProvider";
import EpisodePurchaseSheet from "./EpisodePurchaseSheet";
import { LiquidGlassButton } from "./LiquidGlassSurface";
import { seriesSlugs as seriesKeys } from "./GyroSeries";

type ViewerEpisode = ApiContent & { playable: boolean };

/** Open published artwork episodes directly when playback confirms access. */
export default function HomeEpisodeAccess({ seriesIndex, episode, catalog, onReady, onClose }: { seriesIndex: number; episode: number; catalog?: ViewerEpisode[]; onReady: (playback: Playback) => void; onClose: () => void }) {
  const { accessToken: token } = useAuth();
  const [content, setContent] = useState<ApiContent | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [showLoading, setShowLoading] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => {
    try { sessionStorage.setItem("rv-home-payment-context", JSON.stringify({ seriesIndex, episode })); } catch { /* Returning users can reopen the episode manually. */ }
    const abort = new AbortController();
    void (async () => {
      const episodes = catalog ?? (await apiFetch<{ episodes: ViewerEpisode[] }>(`content/viewer-series/${encodeURIComponent(seriesKeys[seriesIndex])}`, { signal: abort.signal })).episodes;
      if (abort.signal.aborted) return;
      // Home artwork currently represents season one; never match another season by accident.
      const item = episodes.find(item => (item.seasonNumber ?? 1) === 1 && item.episodeNumber === episode);
      if (!item?.playable) throw new Error("This episode isn’t available yet. Come back soon for the next story.");
      if (!token) { setContent(item); return; }
      try {
        const playback = await createPlayback(item.id, token, getDeviceId());
        if (!abort.signal.aborted) onReadyRef.current(playback);
      } catch (e) {
        if (abort.signal.aborted) return;
        if (e instanceof ApiError && e.status === 403) setContent(item);
        else throw e;
      }
    })().catch(e => { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Could not open this episode. Please retry."); });
    return () => abort.abort();
  }, [seriesIndex, episode, catalog, attempt, token]);
  useEffect(() => {
    if (content || error || showLoading) return;
    const timer = window.setTimeout(() => setShowLoading(true), 200);
    return () => window.clearTimeout(timer);
  }, [content, error, showLoading]);
  const showDialog = !content && (showLoading || Boolean(error));
  useEffect(() => {
    if (!showDialog) return;
    const modal = dialog.current!;
    const focus = document.activeElement as HTMLElement | null;
    modal.showModal();
    return () => { modal.close(); focus?.focus({ preventScroll: true }); };
  }, [showDialog]);
  if (content) return <EpisodePurchaseSheet episodeId={content.id} seriesId={content.seriesId} title={content.title} onReady={onReady} onClose={onClose} />;
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); onClose(); }} aria-label="Episode availability" className="fixed inset-0 m-auto w-[calc(100%-32px)] max-w-sm rounded-3xl border border-white/15 bg-[#191715] p-6 text-white backdrop:bg-black/70"><h2 className="text-xl font-semibold">Episode {String(episode).padStart(2, "0")}</h2><p role={error ? "alert" : "status"} className="my-5 text-sm leading-relaxed text-white/75">{error || "Opening your episode…"}</p><div className="flex gap-3">{error && <button onClick={() => { setError(""); setAttempt(value => value + 1); }} className="min-h-11 rounded-full bg-white px-5 text-sm text-black">Try again</button>}<LiquidGlassButton onClick={onClose} className="min-h-11 rounded-full px-5 text-sm">Back to episodes</LiquidGlassButton></div></dialog>;
}
