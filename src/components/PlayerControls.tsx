"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { LiquidGlassSurface } from "./LiquidGlassSurface";

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const value = Math.floor(seconds);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = String(value % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const EASE = "cubic-bezier(.22,1,.36,1)";

function icon(paths: ReactNode) {
  return function Icon({ className = "size-5" }: { className?: string }) {
    return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>;
  };
}

export const BackIcon = icon(<path d="m14 6-6 6 6 6" />);
export const FullscreenEnterIcon = icon(<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />);
export const FullscreenExitIcon = icon(<path d="M9 4v4H5M15 4v4h4M9 20v-4H5M15 20v-4h4" />);
export const CaptionsIcon = icon(<><rect x="3" y="5" width="18" height="14" rx="3.5" /><path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6" /></>);
export const SettingsIcon = icon(<><path d="M4 7h8M18 7h2M4 17h2M12 17h8" /><circle cx="15" cy="7" r="2.2" /><circle cx="9" cy="17" r="2.2" /></>);
export const CheckIcon = icon(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const ChevronRightIcon = icon(<path d="m9 6 6 6-6 6" />);
export const SunIcon = icon(<><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></>);
export const RotateIcon = icon(<><path d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6" /><path d="M18 3v4h-4M6 21v-4h4" /></>);

/** A scrubbing timeline: buffered + played fill, a growing thumb, a time bubble on hover/drag, and slider keyboard support. */
export function Scrubber({ position, duration, buffered, disabled, onCommit, onScrubChange }: {
  position: number;
  duration: number;
  buffered: number;
  disabled: boolean;
  onCommit: (seconds: number) => void;
  onScrubChange?: (scrubbing: boolean) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const active = dragging || hover !== null;
  const shown = dragging ? dragValue : position;
  const fraction = duration > 0 ? clamp(shown / duration, 0, 1) : 0;
  const bubbleFraction = dragging ? fraction : hover ?? fraction;

  const fractionAt = (clientX: number) => {
    const box = track.current?.getBoundingClientRect();
    return box && box.width > 0 ? clamp((clientX - box.left) / box.width, 0, 1) : 0;
  };
  const setScrubbing = (value: boolean) => { setDragging(value); onScrubChange?.(value); };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || !duration) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragValue(fractionAt(event.clientX) * duration);
    setScrubbing(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || !duration) return;
    const next = fractionAt(event.clientX);
    if (dragging) setDragValue(next * duration);
    if (dragging || event.pointerType === "mouse") setHover(next);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onCommit(fractionAt(event.clientX) * duration);
    setScrubbing(false);
    if (event.pointerType !== "mouse") setHover(null);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !duration) return;
    const step = event.shiftKey ? 15 : 5;
    const next = event.key === "ArrowRight" || event.key === "ArrowUp" ? position + step
      : event.key === "ArrowLeft" || event.key === "ArrowDown" ? position - step
      : event.key === "Home" ? 0 : event.key === "End" ? duration : null;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    onCommit(clamp(next, 0, duration));
  };

  return <div
    role="slider" tabIndex={disabled ? -1 : 0} aria-label="Playback position" aria-orientation="horizontal" aria-disabled={disabled}
    aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(shown)} aria-valuetext={`${formatTime(shown)} of ${formatTime(duration)}`}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    onPointerCancel={() => setScrubbing(false)} onPointerLeave={() => { if (!dragging) setHover(null); }} onKeyDown={onKeyDown}
    className={`group relative flex h-11 min-w-0 flex-1 touch-none select-none items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${disabled ? "opacity-40" : "cursor-pointer"}`}
  >
    <div ref={track} className="relative w-full">
      <div className="relative w-full overflow-hidden rounded-full bg-white/25 motion-reduce:transition-none" style={{ height: active ? 10 : 6, transition: `height 220ms ${EASE}` }}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-white/35" style={{ width: `${clamp(buffered, 0, 1) * 100}%`, transition: "width 400ms linear" }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${fraction * 100}%`, transition: dragging ? "none" : "width 250ms linear" }} />
      </div>
      <div aria-hidden="true" className="absolute top-1/2 rounded-full bg-white shadow-[0_2px_10px_#0006]" style={{ left: `${fraction * 100}%`, width: 14, height: 14, transform: `translate(-50%,-50%) scale(${dragging ? 1.5 : active ? 1.2 : 1})`, transition: `transform 220ms ${EASE}${dragging ? "" : ", left 250ms linear"}` }} />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-full mb-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-md" style={{ left: `${clamp(bubbleFraction, 0.06, 0.94) * 100}%`, transform: `translate(-50%, ${active ? 0 : 6}px)`, opacity: active ? 1 : 0, transition: `opacity 160ms ease-out, transform 220ms ${EASE}` }}>
        {formatTime(dragging ? dragValue : bubbleFraction * duration)}
      </div>
    </div>
  </div>;
}

export type SettingsPage = "root" | "quality" | "captions" | "speed";
export type CaptionTrack = { code: string; name: string };

const QUALITY_LABELS: Record<string, string> = { highres: "4320p", hd2880: "2880p", hd2160: "2160p (4K)", hd1440: "1440p", hd1080: "1080p", hd720: "720p", large: "480p", medium: "360p", small: "240p", tiny: "144p", auto: "Auto" };
export const qualityLabel = (level: string) => QUALITY_LABELS[level] ?? level;
export const rateLabel = (rate: number) => rate === 1 ? "Normal" : `${rate}×`;

function Row({ label, value, onClick, selected, trailing, disabled, hint, focusFirst }: { label: string; value?: string; onClick?: () => void; selected?: boolean; trailing?: ReactNode; disabled?: boolean; hint?: string; focusFirst?: boolean }) {
  return <button type="button" role={selected === undefined ? "menuitem" : "menuitemradio"} aria-checked={selected} disabled={disabled} onClick={onClick} data-first={focusFirst ? "" : undefined} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-3 text-left text-[15px] font-medium text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent">
    <span className="min-w-0"><span className="block truncate">{label}</span>{hint && <span className="mt-0.5 block text-xs font-normal text-white/55">{hint}</span>}</span>
    <span className="flex shrink-0 items-center gap-1.5 text-sm text-white/60">{value}{selected && <CheckIcon className="size-4 text-white" />}{trailing}</span>
  </button>;
}

function Switch({ on }: { on: boolean }) {
  return <span aria-hidden="true" className={`relative inline-block h-[26px] w-[44px] rounded-full transition-colors duration-200 ${on ? "bg-[#34c759]" : "bg-white/25"}`}>
    <span className="absolute top-[2px] left-[2px] size-[22px] rounded-full bg-white shadow-[0_2px_6px_#0005]" style={{ transform: `translateX(${on ? 18 : 0}px)`, transition: `transform 260ms ${EASE}` }} />
  </span>;
}

/** Liquid-glass settings menu: a popover on wide screens, a bottom sheet on phones. */
export function SettingsPanel({ open, page, onPage, onClose, qualities, quality, onQuality, tracks, captionLang, onCaption, rates, rate, onRate, brightness, onBrightness, rotationSupported, autoRotate, onAutoRotate }: {
  open: boolean; page: SettingsPage; onPage: (page: SettingsPage) => void; onClose: () => void;
  qualities: string[]; quality: string; onQuality: (level: string) => void;
  tracks: CaptionTrack[]; captionLang: string | null; onCaption: (code: string | null) => void;
  rates: number[]; rate: number; onRate: (rate: number) => void;
  brightness: number; onBrightness: (value: number) => void;
  rotationSupported: boolean; autoRotate: boolean; onAutoRotate: (value: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>("[data-first]")?.focus({ preventScroll: true });
  }, [open, page]);

  const captionName = captionLang ? tracks.find(track => track.code === captionLang)?.name ?? captionLang : "Off";
  const header = (title: string) => <div className="flex items-center gap-1 px-1 pb-1">
    <button type="button" onClick={() => onPage("root")} aria-label="Back to settings" data-first="" className="grid size-11 place-items-center rounded-full text-white outline-none hover:bg-white/10 focus-visible:bg-white/15"><BackIcon /></button>
    <h3 className="text-[15px] font-semibold text-white">{title}</h3>
  </div>;

  return <div
    ref={root} inert={!open} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}
    className="absolute z-30 inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] origin-bottom motion-reduce:transition-none sm:inset-x-auto sm:right-[max(16px,env(safe-area-inset-right))] sm:bottom-auto sm:top-[calc(max(16px,env(safe-area-inset-top))+60px)] sm:w-[340px] sm:origin-top-right"
    style={{ opacity: open ? 1 : 0, transform: open ? "none" : "scale(.94) translateY(8px)", transition: `opacity 220ms ease-out, transform 360ms ${EASE}`, pointerEvents: open ? "auto" : "none" }}
  >
    <LiquidGlassSurface regular className="w-full rounded-[28px]">
      <div role="menu" aria-label="Player settings" className="max-h-[min(62dvh,440px)] w-full overflow-y-auto overscroll-contain p-2 [scrollbar-width:none] sm:max-h-[calc(100dvh-128px)] [&::-webkit-scrollbar]:hidden">
        {page === "root" && <>
          <Row focusFirst label="Quality" value={qualityLabel(quality)} trailing={<ChevronRightIcon className="size-4" />} onClick={() => onPage("quality")} />
          <Row label="Subtitles & language" value={captionName} trailing={<ChevronRightIcon className="size-4" />} onClick={() => onPage("captions")} />
          <Row label="Playback speed" value={rateLabel(rate)} trailing={<ChevronRightIcon className="size-4" />} onClick={() => onPage("speed")} />
          <div className="mx-3 my-1 h-px bg-white/15" />
          <div className="flex min-h-11 items-center gap-3 px-3 py-2">
            <SunIcon className="size-5 shrink-0 text-white/80" />
            <input type="range" aria-label="Brightness" min={50} max={150} step={1} value={brightness} onChange={event => onBrightness(Number(event.target.value))} className="h-6 w-full min-w-0 cursor-pointer accent-white" />
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/60">{brightness}%</span>
          </div>
          <Row label="Auto-rotate" hint={rotationSupported ? (autoRotate ? "Follows your device" : "Locked to current orientation") : "Use your device’s rotation lock"} disabled={!rotationSupported} onClick={() => onAutoRotate(!autoRotate)} trailing={<span className="ml-1 flex items-center"><RotateIcon className="mr-2 size-4 text-white/60" /><Switch on={autoRotate} /></span>} />
        </>}
        {page === "quality" && <>
          {header("Quality")}
          <Row focusFirst={false} label="Auto" selected={quality === "auto"} onClick={() => onQuality("auto")} />
          {qualities.map(level => <Row key={level} label={qualityLabel(level)} selected={quality === level} onClick={() => onQuality(level)} />)}
          <p className="px-3 pt-2 pb-1 text-xs leading-snug text-white/50">YouTube decides the final resolution based on your connection and screen.</p>
        </>}
        {page === "captions" && <>
          {header("Subtitles & language")}
          <Row label="Off" selected={captionLang === null} onClick={() => onCaption(null)} />
          {tracks.map(track => <Row key={track.code} label={track.name} selected={captionLang === track.code} onClick={() => onCaption(track.code)} />)}
          {tracks.length === 0 && <p className="px-3 py-2 text-sm leading-snug text-white/60">No subtitles are available for this video yet. They appear once playback starts.</p>}
        </>}
        {page === "speed" && <>
          {header("Playback speed")}
          {rates.map(value => <Row key={value} label={rateLabel(value)} selected={rate === value} onClick={() => onRate(value)} />)}
        </>}
      </div>
    </LiquidGlassSurface>
  </div>;
}
