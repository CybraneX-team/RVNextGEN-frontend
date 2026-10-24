"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { LiquidGlassButton, LiquidGlassSurface } from "./LiquidGlassSurface";
import { BackIcon, CaptionsIcon, FullscreenEnterIcon, FullscreenExitIcon, Scrubber, SettingsIcon, SunIcon, SettingsPanel, formatTime, type CaptionTrack, type SettingsPage } from "./PlayerControls";

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
  getVideoLoadedFraction?: () => number;
  getAvailableQualityLevels?: () => string[];
  getPlaybackQuality?: () => string;
  setPlaybackQuality?: (quality: string) => void;
  getAvailablePlaybackRates?: () => number[];
  getPlaybackRate?: () => number;
  setPlaybackRate?: (rate: number) => void;
  loadModule?: (module: string) => void;
  getOption?: (module: string, option: string) => unknown;
  setOption?: (module: string, option: string, value: unknown) => void;
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

type FullscreenDocument = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
const fullscreenElement = () => (document as FullscreenDocument).fullscreenElement ?? (document as FullscreenDocument).webkitFullscreenElement ?? null;
const fullscreenAvailable = () => typeof document !== "undefined" && Boolean(document.fullscreenEnabled || (document as FullscreenDocument).webkitFullscreenEnabled);
const exitFullscreen = () => { void Promise.resolve(document.exitFullscreen?.() ?? (document as FullscreenDocument).webkitExitFullscreen?.()).catch(() => {}); };
const enterFullscreen = (element: FullscreenElement) => Promise.resolve(element.requestFullscreen?.({ navigationUI: "hide" }) ?? element.webkitRequestFullscreen?.() ?? Promise.reject(new Error("Full screen unavailable")));
type LockableOrientation = ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
const orientation = () => (typeof screen === "undefined" ? undefined : screen.orientation as LockableOrientation | undefined);
const BRIGHTNESS_KEY = "rv-player-brightness";
// Netflix-style: let the episode art settle for a moment, then start playing on its own.
const AUTOPLAY_DELAY_MS = 1000;

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
  const [buffered, setBuffered] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [panel, setPanel] = useState<SettingsPage | null>(null);
  const [chrome, setChrome] = useState(true);
  const [activity, setActivity] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenSupported] = useState(fullscreenAvailable);
  const [brightness, setBrightness] = useState(() => {
    try { const saved = Number(localStorage.getItem(BRIGHTNESS_KEY)); return saved >= 50 && saved <= 150 ? saved : 100; } catch { return 100; }
  });
  const [qualities, setQualities] = useState<string[]>([]);
  const [quality, setQuality] = useState("auto");
  const [tracks, setTracks] = useState<CaptionTrack[]>([]);
  const [captionLang, setCaptionLang] = useState<string | null>(null);
  const [streamStarted, setStreamStarted] = useState(false);
  // Browsers without a Fullscreen API for pages (iPhone Safari): full screen is YouTube's own player controls.
  const [nativeControls, setNativeControls] = useState(false);
  const resumeAt = useRef(0);
  const firstStart = useRef(true);
  const [adjustingBrightness, setAdjustingBrightness] = useState(false);
  const [brightnessHud, setBrightnessHud] = useState(false);
  const brightnessGesture = useRef<{ y: number; start: number; height: number; moved: boolean } | null>(null);
  const lastWake = useRef(0);
  const closing = useRef(false);
  const dismiss = useRef<() => void>(() => {});

  useEffect(() => {
    if (!streamUrl) return;
    const timer = window.setTimeout(() => setStreamStarted(true), AUTOPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [streamUrl]);

  useEffect(() => {
    // Mount the embed as soon as the dialog is open.
    if (!videoId || !playerMount.current) return;
    const openedAt = performance.now();
    const startDelay = firstStart.current ? AUTOPLAY_DELAY_MS : 0;
    firstStart.current = false;
    let autoplayTimer: number | undefined;
    let live = true;
    let instance: YouTubePlayer | null = null;
    void loadYouTubeApi().then(() => {
      if (!live || !playerMount.current || !window.YT) return;
      instance = new window.YT.Player(playerMount.current, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: { autoplay: 0, controls: nativeControls ? 1 : 0, disablekb: nativeControls ? 0 : 1, fs: nativeControls ? 1 : 0, start: Math.floor(resumeAt.current), playsinline: 1, rel: 0, cc_load_policy: 0, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            if (!live) { event.target.destroy(); return; }
            player.current = event.target;
            setPlayerReady(true);
            const length = event.target.getDuration();
            if (Number.isFinite(length)) setDuration(length);
            event.target.loadModule?.("captions");
            // Start one second after the card opened, counting the time the player spent loading.
            autoplayTimer = window.setTimeout(() => { if (live) event.target.playVideo(); }, Math.max(0, startDelay - (performance.now() - openedAt)));
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
      window.clearTimeout(autoplayTimer);
      player.current?.destroy();
      player.current = null;
      instance = null;
    };
  }, [videoId, nativeControls]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const current = player.current?.getCurrentTime();
      const length = player.current?.getDuration();
      if (Number.isFinite(current)) setPosition(current!);
      if (Number.isFinite(length) && length! > 0) setDuration(length!);
      const loaded = player.current?.getVideoLoadedFraction?.();
      if (Number.isFinite(loaded)) setBuffered(loaded!);
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing]);

  // Ask the embed what it can do: quality levels, subtitle tracks and speeds are only known once it plays.
  const refreshCapabilities = () => {
    const instance = player.current;
    if (!instance) return;
    try {
      const levels = (instance.getAvailableQualityLevels?.() ?? []).filter(level => level !== "auto");
      if (levels.length) setQualities(levels);
      const current = instance.getPlaybackQuality?.();
      if (current && current !== "unknown") setQuality(previous => previous === "auto" ? previous : current);
      const list = instance.getOption?.("captions", "tracklist");
      if (Array.isArray(list)) {
        const seen = new Set<string>();
        setTracks(list.flatMap((entry: { languageCode?: string; languageName?: string; displayName?: string }) => {
          if (!entry.languageCode || seen.has(entry.languageCode)) return [];
          seen.add(entry.languageCode);
          return [{ code: entry.languageCode, name: entry.languageName || entry.displayName || entry.languageCode }];
        }));
      }
    } catch { /* The embed may not expose every option yet. */ }
  };
  const refreshRef = useRef(refreshCapabilities);
  useEffect(() => { refreshRef.current = refreshCapabilities; });
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => refreshRef.current(), 800);
    return () => window.clearTimeout(timer);
  }, [playing]);

  const wake = () => { setChrome(true); setActivity(count => count + 1); };
  const chromeVisible = chrome || !playing || panel !== null || scrubbing;
  useEffect(() => {
    if (!chrome || !playing || panel !== null || scrubbing) return;
    const timer = window.setTimeout(() => setChrome(false), 3200);
    return () => window.clearTimeout(timer);
  }, [chrome, playing, panel, scrubbing, activity]);

  useEffect(() => {
    const onChange = () => {
      const active = Boolean(fullscreenElement());
      setFullscreen(active);
      if (!active) { try { orientation()?.unlock(); } catch { /* Not locked. */ } }
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => { document.removeEventListener("fullscreenchange", onChange); document.removeEventListener("webkitfullscreenchange", onChange); };
  }, []);
  const toggleNativeControls = () => {
    resumeAt.current = player.current?.getCurrentTime() ?? position;
    setPlayerReady(false);
    setPlaying(false);
    setPanel(null);
    setNativeControls(value => !value);
  };
  const toggleFullscreen = async () => {
    if (fullscreenElement()) { exitFullscreen(); return; }
    const modal = dialog.current;
    if (!modal) return;
    // The dialog fills the screen; if the browser refuses it, fall back to the whole page.
    try { await enterFullscreen(modal); } catch { try { await enterFullscreen(document.documentElement); } catch { return; } }
    // On phones and tablets, turn the screen to landscape once full screen is on (Android; iOS has no lock).
    if (window.matchMedia("(pointer: coarse)").matches) {
      try { await orientation()?.lock?.("landscape"); } catch { /* The browser or device doesn't allow locking. */ }
    }
  };


  useEffect(() => {
    if (!brightnessHud || adjustingBrightness) return;
    const timer = window.setTimeout(() => setBrightnessHud(false), 900);
    return () => window.clearTimeout(timer);
  }, [brightnessHud, adjustingBrightness, brightness]);

  useEffect(() => {
    try { localStorage.setItem(BRIGHTNESS_KEY, String(brightness)); } catch { /* Brightness just won't persist. */ }
  }, [brightness]);

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
      if (fullscreenElement()) exitFullscreen();
      modal.close();
      onClose();
      previousFocus?.focus({ preventScroll: true });
    };
    return () => {
      clone.remove();
      if (fullscreenElement()) exitFullscreen();
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

  const chooseQuality = (level: string) => {
    setQuality(level);
    player.current?.setPlaybackQuality?.(level);
  };
  const chooseCaption = (code: string | null) => {
    setCaptionLang(code);
    try { player.current?.setOption?.("captions", "track", code ? { languageCode: code } : {}); } catch { /* Captions module unavailable. */ }
  };
  const toggleMute = () => { if (muted) { player.current?.unMute(); player.current?.setVolume(100); } else player.current?.mute(); setMuted(!muted); };
  const togglePlay = () => { if (playing) player.current?.pauseVideo(); else player.current?.playVideo(); };
  const commitSeek = (seconds: number) => { player.current?.seekTo(seconds, true); setPosition(seconds); };
  const openPanel = (page: SettingsPage) => { refreshCapabilities(); setPanel(panel === page && page !== "root" ? null : page); };
  const backgroundTap = (pointerType: string) => {
    if (panel !== null) { setPanel(null); return; }
    // Mouse click plays/pauses; a touch tap just shows or hides the controls.
    if (pointerType === "mouse") togglePlay();
    else if (chromeVisible && playing) setChrome(false); else wake();
  };
  // Netflix-style: drag up or down on the left side of the video to change brightness.
  const brightnessDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    brightnessGesture.current = { y: event.clientY, start: brightness, height: event.currentTarget.clientHeight, moved: false };
  };
  const brightnessMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = brightnessGesture.current;
    if (!gesture) return;
    const delta = gesture.y - event.clientY;
    if (!gesture.moved && Math.abs(delta) < 8) return;
    if (!gesture.moved) { gesture.moved = true; setAdjustingBrightness(true); }
    setBrightnessHud(true);
    // Dragging the full height of the zone sweeps the whole 50–150% range.
    setBrightness(Math.round(Math.min(150, Math.max(50, gesture.start + (delta / Math.max(1, gesture.height * 0.8)) * 100))));
  };
  const brightnessUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = brightnessGesture.current;
    brightnessGesture.current = null;
    setAdjustingBrightness(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (gesture && !gesture.moved && event.type === "pointerup") backgroundTap(event.pointerType);
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (streamUrl || nativeControls || event.metaKey || event.ctrlKey || event.altKey) return;
    wake();
    if ((event.target as HTMLElement).closest("button, [role=slider], input, [role=menu]") && event.key !== "f" && event.key !== "m" && event.key !== "c") return;
    const key = event.key.toLowerCase();
    if (key === " " || key === "k") { event.preventDefault(); togglePlay(); }
    else if (key === "arrowleft") { event.preventDefault(); skipBy(-10); }
    else if (key === "arrowright") { event.preventDefault(); skipBy(10); }
    else if (key === "m") toggleMute();
    else if (key === "f" && fullscreenSupported) void toggleFullscreen();
    else if (key === "c") openPanel("captions");
  };

  const controlsOn = !streamUrl && !playerError && !nativeControls;
  const fade = `transition-opacity duration-300 motion-reduce:transition-none ${chromeVisible ? "opacity-100" : "opacity-0"}`;

  return <dialog ref={dialog} aria-label={`${seriesTitle} — Episode ${String(selection.episode).padStart(2, "0")}`} onKeyDown={onKeyDown} onPointerMove={() => { if (!streamUrl && performance.now() - lastWake.current > 300) { lastWake.current = performance.now(); wake(); } }} onCancel={event => { event.preventDefault(); if (panel !== null) setPanel(null); else dismiss.current(); }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-white backdrop:bg-transparent">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/70" />
    <div ref={artwork} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[#302116] [&>*]:origin-top-left">
      <div className="absolute inset-0 z-[1] bg-black/40" />
      {videoId && <div className="absolute inset-0 z-[2]" style={{ filter: brightness === 100 ? undefined : `brightness(${brightness / 100})` }}><div key={nativeControls ? "native" : "custom"} ref={playerMount} className="absolute inset-0 [&_iframe]:size-full [&_iframe]:border-0" /></div>}
    </div>
    {streamUrl && streamStarted && <iframe src={streamUrl} title={seriesTitle} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="absolute inset-0 z-10 size-full border-0" />}
    <div className={`absolute inset-0 z-20 ${streamUrl || nativeControls ? "pointer-events-none" : ""}`} onClick={event => {
      if (streamUrl || nativeControls || event.target !== event.currentTarget) return;
      backgroundTap((event.nativeEvent as PointerEvent).pointerType);
    }}>
      {controlsOn && <div aria-hidden="true" onPointerDown={brightnessDown} onPointerMove={brightnessMove} onPointerUp={brightnessUp} onPointerCancel={brightnessUp} className="absolute inset-y-24 left-0 w-[32%] touch-none" />}
      {controlsOn && <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-[max(16px,env(safe-area-inset-left))] z-10 h-[min(240px,46dvh)] w-12 -translate-y-1/2 transition-[opacity,transform] duration-300 motion-reduce:transition-none" style={{ opacity: brightnessHud ? 1 : 0, transform: `translateY(-50%) translateX(${brightnessHud ? 0 : -8}px)` }}>
        <LiquidGlassSurface className="h-full w-full rounded-full"><div className="relative h-[min(240px,46dvh)] w-12 overflow-hidden rounded-full">
          <div className="absolute inset-x-0 bottom-0 bg-white/80" style={{ height: `${Math.max(0, Math.min(100, brightness - 50))}%`, transition: adjustingBrightness ? "none" : "height 200ms ease-out" }} />
          <SunIcon className="absolute bottom-3 left-1/2 size-5 -translate-x-1/2 text-white mix-blend-difference" />
        </div></LiquidGlassSurface>
      </div>}
      <div inert={!chromeVisible && controlsOn} className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 pt-[max(16px,env(safe-area-inset-top))] pr-[max(16px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))] ${controlsOn ? "bg-gradient-to-b from-black/55 to-transparent pb-12" : ""} ${streamUrl || nativeControls ? "" : fade}`}>
        <LiquidGlassButton type="button" autoFocus onClick={() => dismiss.current()} aria-label="Close video and return to episodes" title="Back to episodes" className="grid size-12 place-items-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <BackIcon />
        </LiquidGlassButton>
        {(controlsOn || nativeControls || (streamUrl && fullscreenSupported)) && <div className="flex items-center gap-2">
          {controlsOn && <>
          <LiquidGlassButton type="button" onClick={() => openPanel("captions")} disabled={!playerReady} aria-label="Subtitles and language" aria-haspopup="menu" aria-expanded={panel === "captions"} title="Subtitles (C)" className="grid size-11 place-items-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"><CaptionsIcon /></LiquidGlassButton>
          <LiquidGlassButton type="button" onClick={() => openPanel("root")} disabled={!playerReady} aria-label="Player settings" aria-haspopup="menu" aria-expanded={panel !== null} title="Settings" className="grid size-11 place-items-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"><SettingsIcon /></LiquidGlassButton>
          </>}
          {fullscreenSupported ? <LiquidGlassButton type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Exit full screen" : "Enter full screen"} title="Full screen (F)" className="grid size-11 place-items-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40">{fullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}</LiquidGlassButton> : videoId && !streamUrl && <LiquidGlassButton type="button" onClick={toggleNativeControls} aria-label={nativeControls ? "Back to standard controls" : "Full screen"} title={nativeControls ? "Back to standard controls" : "Full screen (opens YouTube’s own controls on this device)"} className="grid size-11 place-items-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40">{nativeControls ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}</LiquidGlassButton>}
        </div>}
      </div>
      {playerError && <p role="alert" className="absolute inset-x-6 top-[38%] text-center text-sm text-white">{playerError}</p>}
      {videoId && !playerReady && !playerError && <p role="status" className="absolute inset-x-6 top-[38%] text-center text-sm text-white">Loading video…</p>}
      {controlsOn && <div inert={!chromeVisible} className={`pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-[clamp(12px,5vw,52px)] px-4 ${fade}`}>
        <LiquidGlassButton type="button" onClick={() => skipBy(-10)} disabled={!playerReady} aria-label="Rewind 10 seconds" className="grid size-[58px] [@media(max-height:480px)]:size-12 place-items-center rounded-full text-white disabled:opacity-40 sm:size-[62px]">
          <svg aria-hidden="true" className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16.5 4.2A9 9 0 1 1 7.5 4.2" strokeLinecap="round" /><path d="m5.4 4.2 3.6-1.7-.1 3.6" fill="currentColor" stroke="none" /><text x="12" y="13" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="600" fill="currentColor" stroke="none">10</text></svg>
        </LiquidGlassButton>
        <LiquidGlassButton type="button" onClick={() => playing ? player.current?.pauseVideo() : player.current?.playVideo()} disabled={!playerReady} aria-label={playing ? "Pause" : "Play"} className="grid size-[86px] [@media(max-height:480px)]:size-[68px] place-items-center rounded-full text-white disabled:opacity-40 sm:size-[104px]">
          {playing ? <svg aria-hidden="true" className="size-12 sm:size-14" viewBox="0 0 100 100" fill="currentColor"><rect x="35" y="30" width="10" height="40" rx="2" /><rect x="55" y="30" width="10" height="40" rx="2" /></svg> : <svg aria-hidden="true" className="size-12 sm:size-14" viewBox="0 0 100 100" fill="currentColor"><path d="M37 27Q37 24 40 26L75 47Q78 50 75 53L40 74Q37 76 37 73Z" /></svg>}
        </LiquidGlassButton>
        <LiquidGlassButton type="button" onClick={() => skipBy(10)} disabled={!playerReady} aria-label="Forward 10 seconds" className="grid size-[58px] [@media(max-height:480px)]:size-12 place-items-center rounded-full text-white disabled:opacity-40 sm:size-[62px]">
          <svg aria-hidden="true" className="size-8 -scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16.5 4.2A9 9 0 1 1 7.5 4.2" strokeLinecap="round" /><path d="m5.4 4.2 3.6-1.7-.1 3.6" fill="currentColor" stroke="none" /><text x="12" y="13" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="600" fill="currentColor" stroke="none" transform="translate(24 0) scale(-1 1)">10</text></svg>
        </LiquidGlassButton>
      </div>}
      {controlsOn && <div inert={!chromeVisible} className={`pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/75 to-transparent pt-16 pr-[max(24px,env(safe-area-inset-right))] pb-[max(20px,env(safe-area-inset-bottom))] pl-[max(24px,env(safe-area-inset-left))] sm:px-10 [@media(max-height:480px)]:gap-1 [@media(max-height:480px)]:pt-8 ${fade}`}>
        <div className="flex items-end justify-between gap-4"><div className="min-w-0"><p className="truncate text-sm text-white/75 [@media(max-height:480px)]:hidden">{seriesTitle}</p><h2 className="text-xl font-bold [@media(max-height:480px)]:text-base">Episode {String(selection.episode).padStart(2, "0")}</h2></div>
          <LiquidGlassButton type="button" disabled={!playerReady} onClick={() => { if (muted) { player.current?.unMute(); player.current?.setVolume(100); } else player.current?.mute(); setMuted(!muted); }} aria-label={muted ? "Unmute" : "Mute"} className="grid size-11 shrink-0 place-items-center rounded-full text-white disabled:opacity-40"><svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 5 6 9H3v6h3l5 4V5Zm5 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></svg></LiquidGlassButton>
        </div>
        <LiquidGlassSurface className="pointer-events-auto w-full rounded-full"><div className="flex h-12 w-full items-center gap-3 px-4">
          <span className="w-11 shrink-0 text-xs font-medium tabular-nums text-white/85">{formatTime(position)}</span>
          <Scrubber position={position} duration={duration} buffered={buffered} disabled={!playerReady || !duration} onCommit={commitSeek} onScrubChange={setScrubbing} />
          <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-white/85">{duration ? `-${formatTime(Math.max(0, duration - position))}` : "--:--"}</span>
        </div></LiquidGlassSurface>
        {!videoId && <p role="status" className="text-center text-sm text-white/75">Video coming soon</p>}
      </div>}
      {controlsOn && <SettingsPanel open={panel !== null} page={panel ?? "root"} onPage={setPanel} onClose={() => setPanel(null)} qualities={qualities} quality={quality} onQuality={chooseQuality} tracks={tracks} captionLang={captionLang} onCaption={chooseCaption} brightness={brightness} onBrightness={setBrightness} />}
    </div>
  </dialog>;
}
