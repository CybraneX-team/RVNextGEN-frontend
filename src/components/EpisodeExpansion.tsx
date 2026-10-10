"use client";

import { useEffect, useRef, useState } from "react";

export type EpisodeSelection = { episode: number; origin: HTMLElement };

type YouTubePlayer = {
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
function loadYouTubeApi() {
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

/** Keep the original scene mounted while the selected card fills the viewport. */
export default function EpisodeExpansion({ selection, seriesTitle, videoId, onClose }: { selection: EpisodeSelection; seriesTitle: string; videoId?: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const artwork = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLDivElement>(null);
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
    const ui = controls.current!;
    const background = backdrop.current!;
    const tint = shade.current!;
    let disposed = false;
    const { origin } = selection;
    const bounds = origin.getBoundingClientRect();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const previousFocus = document.activeElement as HTMLElement | null;
    closing.current = false;
    const clone = origin.cloneNode(true) as HTMLElement;
    clone.inert = true;
    clone.removeAttribute("id");
    clone.removeAttribute("aria-label");
    clone.setAttribute("aria-hidden", "true");
    clone.style.cssText += `;width:${origin.offsetWidth}px;height:${origin.offsetHeight}px;position:absolute;inset:0;margin:0;transform:none;scale:1;border-radius:0;`;
    cover.prepend(clone);
    const hideOriginal = origin.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 0, fill: "forwards" });
    modal.showModal();
    const rectStyle = (rect: { left: number; top: number; width: number; height: number }, radius: number) => ({
      left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: `${radius}px`,
    });
    const animate = async (reverse: boolean) => {
      const destination = reverse ? origin.getBoundingClientRect() : bounds;
      const radius = parseFloat(getComputedStyle(origin).borderTopLeftRadius) * destination.width / origin.offsetWidth;
      const small = rectStyle(destination, radius);
      const large = rectStyle({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }, 0);
      const duration = reduced ? 0 : 950;
      const options: KeyframeAnimationOptions = { duration, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" };
      const smallScale = `scale(${destination.width / origin.offsetWidth},${destination.height / origin.offsetHeight})`;
      const largeScale = `scale(${window.innerWidth / origin.offsetWidth},${window.innerHeight / origin.offsetHeight})`;
      // Read the live frame before cancelling so an early close reverses smoothly.
      const coverStart = reverse ? rectStyle(cover.getBoundingClientRect(), parseFloat(getComputedStyle(cover).borderTopLeftRadius)) : small;
      const cloneStart = reverse ? getComputedStyle(clone).transform : smallScale;
      const backgroundStyle = getComputedStyle(background);
      const backgroundStart = { backgroundColor: backgroundStyle.backgroundColor, backdropFilter: backgroundStyle.backdropFilter };
      const tintStart = getComputedStyle(tint).opacity;
      const controlsStart = getComputedStyle(ui).opacity;
      [cover, clone, background, tint, ui].forEach(node => node.getAnimations().forEach(animation => animation.cancel()));
      const animations = [
        cover.animate([coverStart, reverse ? small : large], options),
        clone.animate([{ transform: cloneStart }, { transform: reverse ? smallScale : largeScale }], options),
        background.animate([backgroundStart, { backgroundColor: reverse ? "rgba(0,0,0,0)" : "rgba(0,0,0,.7)", backdropFilter: reverse ? "blur(0px)" : "blur(16px)" }], options),
        tint.animate([{ opacity: tintStart }, { opacity: reverse ? 0 : .4 }], options),
        ui.animate([{ opacity: controlsStart }, { opacity: reverse ? 0 : 1 }], { ...options, duration: reduced ? 0 : reverse ? 450 : 650, delay: reduced || reverse ? 0 : 300 }),
      ];
      await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
    };
    dismiss.current = () => {
      if (closing.current) return;
      closing.current = true;
      player.current?.pauseVideo();
      void animate(true).then(() => {
        if (disposed) return;
        hideOriginal.cancel();
        modal.close();
        onClose();
        previousFocus?.focus({ preventScroll: true });
      });
    };
    void animate(false);
    return () => {
      disposed = true;
      hideOriginal.cancel();
      [cover, clone, background, tint, ui].forEach(node => node.getAnimations().forEach(animation => animation.cancel()));
      clone.remove();
      modal.close();
    };
  }, [selection, onClose]);

  return <dialog ref={dialog} aria-label={`${seriesTitle} — Episode ${String(selection.episode).padStart(2, "0")}`} onCancel={event => { event.preventDefault(); dismiss.current(); }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-white backdrop:bg-transparent">
    <div ref={backdrop} aria-hidden="true" className="pointer-events-none absolute inset-0 bg-transparent backdrop-blur-none" />
    <div ref={artwork} aria-hidden="true" className="pointer-events-none absolute overflow-hidden bg-[#302116] [&>*]:origin-top-left">
      <div ref={shade} className="absolute inset-0 z-[1] bg-black opacity-0" />
      {videoId && <div ref={playerMount} className="absolute inset-0 z-[2] [&_iframe]:size-full [&_iframe]:border-0" />}
    </div>
    <div ref={controls} className="absolute inset-0 z-20 opacity-0">
      <button type="button" autoFocus onClick={() => dismiss.current()} aria-label="Close video and return to episodes" title="Back to episodes" className="pointer-events-auto absolute top-[max(16px,env(safe-area-inset-top))] left-4 grid size-12 place-items-center rounded-full border border-white/25 bg-black/55 text-white shadow-[0_4px_24px_#0008] backdrop-blur-xl transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m14 6-6 6 6 6" /></svg>
      </button>
      {(!videoId || !playing) && <div role="status" className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 text-center">
        {videoId && playerReady && !playerError && <button type="button" onClick={() => player.current?.playVideo()} aria-label="Play video" className="pointer-events-auto mx-auto grid size-16 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-xl">
          <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </button>}
        <p className="mt-4 text-sm text-white/80">{playerError || (videoId ? playerReady ? "Paused" : "Loading video…" : "Video coming soon")}</p>
      </div>}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-6 pt-20 pb-[max(24px,env(safe-area-inset-bottom))] sm:px-10">
        <p className="mb-1 text-sm text-white/65">{seriesTitle}</p>
        <h2 className="mb-5 text-xl font-bold">Episode {String(selection.episode).padStart(2, "0")}</h2>
        <input type="range" aria-label="Playback position" min={0} max={duration || 0} step={0.1} value={Math.min(position, duration || 0)} disabled={!playerReady || !duration} onChange={event => { const value = Number(event.target.value); setPosition(value); player.current?.seekTo(value, true); }} className="block h-1 w-full accent-white disabled:opacity-40" />
        <div className="mt-4 flex items-center gap-4 text-white/85">
          <button type="button" disabled={!playerReady} onClick={() => playing ? player.current?.pauseVideo() : player.current?.playVideo()} aria-label={playing ? "Pause" : "Play"} className="grid size-11 place-items-center rounded-full bg-white/10 disabled:opacity-40">
            {playing ? <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zm6 0h4v14h-4z" /></svg> : <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </button>
          <span className="text-xs tabular-nums">{videoId ? `${timeLabel(position)} / ${timeLabel(duration)}` : "--:-- / --:--"}</span>
          <button type="button" disabled={!playerReady} onClick={() => { if (muted) { player.current?.unMute(); player.current?.setVolume(100); } else player.current?.mute(); setMuted(!muted); }} aria-label={muted ? "Unmute" : "Mute"} className="ml-auto grid size-11 place-items-center rounded-full bg-white/10 disabled:opacity-40">
            <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 5 6 9H3v6h3l5 4V5Zm5 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></svg>
          </button>
        </div>
      </div>
    </div>
  </dialog>;
}
