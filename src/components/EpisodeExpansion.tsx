"use client";

import { useEffect, useRef, useState } from "react";
import { LiquidGlassButton, LiquidGlassSurface } from "./LiquidGlassSurface";

export type EpisodeSelection = { episode: number; origin: HTMLElement };

export type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  isMuted: () => boolean;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: { Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer; PlayerState: { PLAYING: number; PAUSED: number; ENDED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApi: Promise<void> | undefined;
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  youtubeApi ??= new Promise<void>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => reject(new Error("YouTube player took too long to load.")), 15000);
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      window.clearTimeout(timeout);
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Could not load the YouTube player."));
      };
      document.head.appendChild(script);
    }
  });
  return youtubeApi;
}

function timeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const value = Math.floor(seconds);
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

/** Show the player immediately while keeping the original scene mounted behind it. */
export default function EpisodeExpansion({ selection, seriesTitle, videoId, streamUrl, onClose }: { selection: EpisodeSelection; seriesTitle: string; videoId?: string; streamUrl?: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const artwork = useRef<HTMLDivElement>(null);
  const playerMount = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerError, setPlayerError] = useState("");
  const closing = useRef(false);
  const dismiss = useRef<() => void>(() => {});

  useEffect(() => {
    // Mount the embed as soon as the dialog is open.
    if (!videoId || !playerMount.current) return;
    let live = true;
    let instance: YouTubePlayer | null = null;
    void loadYouTubeApi().then(() => {
      if (!live || !playerMount.current || !window.YT) return;
      instance = new window.YT.Player(playerMount.current, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, playsinline: 1, rel: 0, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            if (!live) { event.target.destroy(); return; }
            player.current = event.target;
            setPlayerReady(true);
            const length = event.target.getDuration();
            if (Number.isFinite(length)) setDuration(length);
            event.target.playVideo();
          },
          onStateChange: (event: { data: number; target: YouTubePlayer }) => {
            if (!live || !window.YT) return;
            setPlaying(event.data === window.YT.PlayerState.PLAYING);
            if (event.data === window.YT.PlayerState.ENDED) setPosition(event.target.getDuration());
          },
          onError: () => { if (live) setPlayerError("This video can’t be played here."); },
        },
      });
      player.current = instance;
    }).catch(error => { if (live) setPlayerError(error instanceof Error ? error.message : "Could not load this video."); });
    return () => {
      live = false;
      player.current?.destroy();
      player.current = null;
      instance = null;
    };
  }, [videoId]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const current = player.current?.getCurrentTime();
      const length = player.current?.getDuration();
      if (Number.isFinite(current)) setPosition(current!);
      if (Number.isFinite(length) && length! > 0) setDuration(length!);
    }, 500);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const modal = dialog.current!;
    const cover = artwork.current!;
    const { origin } = selection;
    const previousFocus = document.activeElement as HTMLElement | null;
    closing.current = false;
    const clone = origin.cloneNode(true) as HTMLElement;
    clone.inert = true;
    clone.removeAttribute("id");
    clone.removeAttribute("aria-label");
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("h1,h2,h3,p,span").forEach(node => {
      if (node.textContent?.trim()) (node as HTMLElement).style.visibility = "hidden";
    });
    clone.style.cssText += `;width:${origin.offsetWidth}px;height:${origin.offsetHeight}px;position:absolute;inset:0;margin:0;transform-origin:top left;transform:scale(${window.innerWidth / origin.offsetWidth},${window.innerHeight / origin.offsetHeight});border-radius:0;`;
    cover.prepend(clone);
    modal.showModal();
    dismiss.current = () => {
      if (closing.current) return;
      closing.current = true;
      player.current?.pauseVideo();
      modal.close();
      onClose();
      previousFocus?.focus({ preventScroll: true });
    };
    return () => {
      clone.remove();
      modal.close();
    };
  }, [selection, onClose]);

  function skipBy(seconds: number) {
    const current = player.current?.getCurrentTime() ?? 0;
    const length = player.current?.getDuration() ?? 0;
    if (length <= 0) return;
    const next = Math.max(0, Math.min(length, current + seconds));
    player.current?.seekTo(next, true);
    setPosition(next);
  }

  return <dialog ref={dialog} aria-label={`${seriesTitle} — Episode ${String(selection.episode).padStart(2, "0")}`} onCancel={event => { event.preventDefault(); dismiss.current(); }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-white backdrop:bg-transparent">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/70" />
    <div ref={artwork} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[#302116] [&>*]:origin-top-left">
      <div className="absolute inset-0 z-[1] bg-black/40" />
      {videoId && <div className="absolute inset-0 z-[2]"><div ref={playerMount} className="absolute inset-0 [&_iframe]:size-full [&_iframe]:border-0" /></div>}
    </div>
    {streamUrl && <iframe src={streamUrl} title={seriesTitle} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 z-10 size-full border-0" />}
    <div className={`absolute inset-0 z-20 ${streamUrl ? "pointer-events-none" : ""}`}>
      <div className="pointer-events-auto absolute top-[max(16px,env(safe-area-inset-top))] left-4"><LiquidGlassButton type="button" autoFocus onClick={() => dismiss.current()} aria-label="Close video and return to episodes" title="Back to episodes" className="grid size-12 place-items-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m14 6-6 6 6 6" /></svg>
      </LiquidGlassButton></div>
      {playerError && <p role="alert" className="absolute inset-x-6 top-[38%] text-center text-sm text-white">{playerError}</p>}
      {videoId && !playerReady && !playerError && <p role="status" className="absolute inset-x-6 top-[38%] text-center text-sm text-white">Loading video…</p>}
      {!streamUrl && !playerError && <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-[clamp(12px,5vw,52px)] px-4">
        <LiquidGlassButton type="button" onClick={() => skipBy(-10)} disabled={!playerReady} aria-label="Rewind 10 seconds" className="grid size-[58px] place-items-center rounded-full text-white disabled:opacity-40 sm:size-[62px]">
          <svg aria-hidden="true" className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16.5 4.2A9 9 0 1 1 7.5 4.2" strokeLinecap="round" /><path d="m5.4 4.2 3.6-1.7-.1 3.6" fill="currentColor" stroke="none" /><text x="12" y="13" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="600" fill="currentColor" stroke="none">10</text></svg>
        </LiquidGlassButton>
        <LiquidGlassButton type="button" onClick={() => playing ? player.current?.pauseVideo() : player.current?.playVideo()} disabled={!playerReady} aria-label={playing ? "Pause" : "Play"} className="grid size-[86px] place-items-center rounded-full text-white disabled:opacity-40 sm:size-[104px]">
          {playing ? <svg aria-hidden="true" className="size-12 sm:size-14" viewBox="0 0 100 100" fill="currentColor"><rect x="35" y="30" width="10" height="40" rx="2" /><rect x="55" y="30" width="10" height="40" rx="2" /></svg> : <svg aria-hidden="true" className="size-12 sm:size-14" viewBox="0 0 100 100" fill="currentColor"><path d="M37 27Q37 24 40 26L75 47Q78 50 75 53L40 74Q37 76 37 73Z" /></svg>}
        </LiquidGlassButton>
        <LiquidGlassButton type="button" onClick={() => skipBy(10)} disabled={!playerReady} aria-label="Forward 10 seconds" className="grid size-[58px] place-items-center rounded-full text-white disabled:opacity-40 sm:size-[62px]">
          <svg aria-hidden="true" className="size-8 -scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16.5 4.2A9 9 0 1 1 7.5 4.2" strokeLinecap="round" /><path d="m5.4 4.2 3.6-1.7-.1 3.6" fill="currentColor" stroke="none" /><text x="12" y="13" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="600" fill="currentColor" stroke="none" transform="translate(24 0) scale(-1 1)">10</text></svg>
        </LiquidGlassButton>
      </div>}
      {!streamUrl && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-6 pt-20 pb-[max(24px,env(safe-area-inset-bottom))] sm:px-10">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-sm text-white/75">{seriesTitle}</p><h2 className="text-xl font-bold">Episode {String(selection.episode).padStart(2, "0")}</h2></div>
          <LiquidGlassButton type="button" disabled={!playerReady} onClick={() => { if (muted) { player.current?.unMute(); player.current?.setVolume(100); } else player.current?.mute(); setMuted(!muted); }} aria-label={muted ? "Unmute" : "Mute"} className="grid size-11 shrink-0 place-items-center rounded-full text-white disabled:opacity-40"><svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 5 6 9H3v6h3l5 4V5Zm5 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></svg></LiquidGlassButton>
        </div>
        <LiquidGlassSurface className="flex h-[26px] items-center rounded-[7px] px-3">
          <input type="range" aria-label="Playback position" min={0} max={duration || 0} step={0.1} value={Math.min(position, duration || 0)} disabled={!playerReady || !duration} onChange={event => { const value = Number(event.target.value); setPosition(value); player.current?.seekTo(value, true); }} className="h-4 w-full cursor-pointer accent-white disabled:cursor-default disabled:opacity-40" />
        </LiquidGlassSurface>
        <p className="mt-2 text-right text-xs tabular-nums text-white/85">{videoId ? `${timeLabel(position)} / ${timeLabel(duration)}` : "--:-- / --:--"}</p>
        {!videoId && <p role="status" className="mt-2 text-center text-sm text-white/75">Video coming soon</p>}
      </div>}
    </div>
  </dialog>;
}
