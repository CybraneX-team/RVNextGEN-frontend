import { apiFetch } from "./client";

export type AnalyticsType = "VIEW" | "PLAY" | "COMPLETE" | "SIGNUP" | "SUBSCRIPTION" | "GENERATION";
type Props = Record<string, string | number | boolean | null>;

/** Per-tab session id (groups a visit's events/watch heartbeats). Survives reloads within the tab. */
export function sessionId(): string {
  try {
    const existing = sessionStorage.getItem("rv_sid");
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem("rv_sid", id);
    return id;
  } catch { return crypto.randomUUID(); }
}

/** Fire-and-forget analytics event. Server enriches with device/os/browser/geo from the request. */
export function trackEvent(type: AnalyticsType, opts: { contentId?: string; properties?: Props } = {}, token?: string | null): void {
  if (!token) return;
  const referrer = typeof document !== "undefined" && document.referrer ? document.referrer : undefined;
  void apiFetch("analytics/events", { method: "POST", token, body: { type, contentId: opts.contentId, sessionId: sessionId(), referrer, properties: opts.properties } }).catch(() => {});
}

/** Fire-and-forget watch heartbeat (START / PROGRESS / COMPLETE) with playback position + duration. */
export function watchBeacon(contentId: string, eventType: "START" | "PROGRESS" | "COMPLETE", token: string | null, opts: { progressSec?: number; durationSec?: number } = {}): void {
  if (!token) return;
  void apiFetch(`content/${contentId}/watch`, { method: "POST", token, body: { eventType, progressSec: opts.progressSec, durationSec: opts.durationSec, sessionId: sessionId() } }).catch(() => {});
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script"); s.src = src; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error("sdk load failed"));
    document.body.appendChild(s);
  });
}

type StreamPlayer = { currentTime: number; duration: number; addEventListener: (e: string, cb: () => void) => void };
declare global { interface Window { Stream?: (iframe: HTMLIFrameElement) => StreamPlayer } }

/**
 * Attach watch telemetry to a Cloudflare Stream iframe: START on play, PROGRESS every ~15s
 * (with position + duration, so drop-off is known), COMPLETE on ended. Returns a cleanup fn.
 * Best-effort: silently no-ops if the Stream SDK can't load.
 */
export function attachStreamTelemetry(iframe: HTMLIFrameElement, contentId: string, token: string | null): () => void {
  let timer: number | undefined;
  let started = false;
  let cancelled = false;
  loadScript("https://embed.cloudflarestream.com/embed/sdk.latest.js").then(() => {
    if (cancelled || !window.Stream) return;
    const player = window.Stream(iframe);
    const snapshot = () => ({ progressSec: Math.round(player.currentTime) || 0, durationSec: Math.round(player.duration) || undefined });
    player.addEventListener("play", () => { if (!started) { started = true; watchBeacon(contentId, "START", token, snapshot()); } });
    player.addEventListener("ended", () => watchBeacon(contentId, "COMPLETE", token, snapshot()));
    timer = window.setInterval(() => { if (started) watchBeacon(contentId, "PROGRESS", token, snapshot()); }, 15000);
  }).catch(() => {});
  return () => { cancelled = true; if (timer) window.clearInterval(timer); };
}
