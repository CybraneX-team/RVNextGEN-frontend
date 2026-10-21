"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client";
import type { ApiContent, Playback } from "@/lib/content";
import EpisodePurchaseSheet from "./EpisodePurchaseSheet";
import { LiquidGlassButton } from "./LiquidGlassSurface";

const seriesKeys = [process.env.NEXT_PUBLIC_DESERT_SERIES_ID || "a-bond-beyond-words", process.env.NEXT_PUBLIC_CAMEL_SERIES_ID || "beyond-the-dunes"];

/** Resolve artwork's series to published content. Never charge for an unmapped placeholder. */
export default function HomeEpisodeAccess({ seriesIndex, episode, onReady, onClose }: { seriesIndex: number; episode: number; onReady: (playback: Playback) => void; onClose: () => void }) {
  const [content, setContent] = useState<ApiContent | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try { sessionStorage.setItem("rv-home-payment-context", JSON.stringify({ seriesIndex, episode })); } catch { /* Returning users can reopen the episode manually. */ }
    const abort = new AbortController();
    void apiFetch<{ series: ApiContent; episodes: (ApiContent & { playable: boolean })[] }>(`content/viewer-series/${encodeURIComponent(seriesKeys[seriesIndex])}`, { signal: abort.signal }).then(data => {
      if (abort.signal.aborted) return;
      // Home artwork currently represents season one; never match another season by accident.
      const item = data.episodes.find(item => (item.seasonNumber ?? 1) === 1 && item.episodeNumber === episode);
      if (!item?.playable) throw new Error("This episode isn’t available yet. Come back soon for the next story.");
      setContent(item);
    }).catch(e => { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Could not load this episode. Please retry."); });
    return () => abort.abort();
  }, [seriesIndex, episode, attempt]);
  useEffect(() => {
    if (content) return;
    const modal = dialog.current!;
    const focus = document.activeElement as HTMLElement | null;
    modal.showModal();
    return () => { modal.close(); focus?.focus({ preventScroll: true }); };
  }, [content]);
  if (content) return <EpisodePurchaseSheet episodeId={content.id} seriesId={content.seriesId} title={content.title} onReady={onReady} onClose={onClose} />;
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); onClose(); }} aria-label="Episode availability" className="fixed inset-0 m-auto w-[calc(100%-32px)] max-w-sm rounded-3xl border border-white/15 bg-[#191715] p-6 text-white backdrop:bg-black/70"><h2 className="text-xl font-semibold">Episode {String(episode).padStart(2, "0")}</h2><p role={error ? "alert" : "status"} className="my-5 text-sm leading-relaxed text-white/75">{error || "Finding your episode…"}</p><div className="flex gap-3">{error && <button onClick={() => { setError(""); setAttempt(value => value + 1); }} className="min-h-11 rounded-full bg-white px-5 text-sm text-black">Try again</button>}<LiquidGlassButton onClick={onClose} className="min-h-11 rounded-full px-5 text-sm">Back to episodes</LiquidGlassButton></div></dialog>;
}
