"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import DesertParallax from "./DesertParallax";
import { useAuth } from "./AuthProvider";
import { LiquidGlassButton, LiquidGlassSurface } from "./LiquidGlassSurface";
import { walletBalance } from "@/lib/wallet";
import { formatCredits } from "@/lib/money";

export default function GyroPage({ onClose }: { onClose?: () => void }) {
  const { user, accessToken } = useAuth();
  const [credits, setCredits] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const refresh = () => {
      void walletBalance(accessToken).then(({ balanceMinor }) => {
        if (active) setCredits(balanceMinor);
      }).catch(() => { if (active) setCredits(null); });
    };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("wallet:balance-changed", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("wallet:balance-changed", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accessToken]);
  const viewer = useRef<HTMLElement>(null);
  const [motionPermission, setMotionPermission] = useState(false);
  const [motionMessage, setMotionMessage] = useState("");
  useEffect(() => {
    const root = viewer.current;
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const Orientation = window.DeviceOrientationEvent as (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }) | undefined;
    const timer = typeof Orientation?.requestPermission === "function" && !preference.matches
      ? window.setTimeout(() => setMotionPermission(true), 1200) : undefined;
    let frame = 0;
    let lastTime = 0;
    let sensorActive = false;
    let x = 0, y = 0, targetX = 0, targetY = 0;
    const render = (time: number) => {
      const dt = lastTime ? Math.min(50, time - lastTime) : 16;
      lastTime = time;
      const blend = 1 - Math.exp(-dt / 85);
      x += (targetX - x) * blend;
      y += (targetY - y) * blend;
      root.style.setProperty("--gyro-x", `${x.toFixed(2)}px`);
      root.style.setProperty("--gyro-y", `${y.toFixed(2)}px`);
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > .05) frame = requestAnimationFrame(render);
      else { frame = 0; lastTime = 0; }
    };
    const move = (nextX: number, nextY: number) => {
      targetX = preference.matches ? 0 : nextX;
      targetY = preference.matches ? 0 : nextY;
      if (!frame) frame = requestAnimationFrame(render);
    };
    const orientation = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null || !Number.isFinite(event.gamma) || !Number.isFinite(event.beta)) return;
      if (!sensorActive) {
        sensorActive = true;
        window.clearTimeout(timer);
        setMotionPermission(false);
        setMotionMessage("");
      }
      move(Math.max(-24, Math.min(24, event.gamma * .8)), Math.max(-18, Math.min(18, (event.beta - 45) * .45)));
    };
    const pointer = (event: PointerEvent) => {
      if (sensorActive || event.pointerType !== "mouse") return;
      const bounds = root.getBoundingClientRect();
      move(((event.clientX - bounds.left) / bounds.width - .5) * 36, ((event.clientY - bounds.top) / bounds.height - .5) * 28);
    };
    const reset = () => move(0, 0);
    window.addEventListener("deviceorientation", orientation);
    root.addEventListener("pointermove", pointer);
    root.addEventListener("pointerleave", reset);
    preference.addEventListener("change", reset);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("deviceorientation", orientation);
      root.removeEventListener("pointermove", pointer);
      root.removeEventListener("pointerleave", reset);
      preference.removeEventListener("change", reset);
    };
  }, []);
  const enableMotion = async () => {
    const Orientation = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
    try {
      if (await Orientation?.requestPermission?.() === "granted") {
        setMotionPermission(false);
        setMotionMessage("");
      } else setMotionMessage("Motion access wasn’t granted.");
    } catch { setMotionMessage("Motion access is unavailable in this browser."); }
  };
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [featuredVisible, setFeaturedVisible] = useState(false);
  const onFeaturedReveal = useCallback((visible: boolean) => setFeaturedVisible(visible), []);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const backIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>;
  return <section ref={viewer} aria-label="Immersive series viewer" className="fixed inset-0 z-50 h-dvh w-full overflow-hidden bg-[#09100d] text-white">
    {onClose && <LiquidGlassButton type="button" onClick={onClose} aria-label="Back to home" wrapperClassName="absolute left-4 top-[max(16px,env(safe-area-inset-top))] z-30" className="grid size-11 place-items-center rounded-full text-white">{backIcon}</LiquidGlassButton>}
    <div inert={!featuredVisible} className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 bg-gradient-to-b from-black/25 to-transparent px-4 pt-[max(16px,env(safe-area-inset-top))] pb-12 transition-opacity duration-500 sm:px-6 ${featuredVisible ? "opacity-100" : "opacity-0"}`} aria-hidden={!featuredVisible}>
      <span aria-label="RV NextGen" className={`select-none whitespace-nowrap text-[18px] leading-8 font-bold tracking-[-.055em] text-white sm:text-[21px] ${onClose ? "ml-14" : ""}`}>
        RV<span className="font-medium text-[#e7b580]">NEXT</span><span className="font-light tracking-[-.07em] text-white/75">GEN</span>
      </span>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <LiquidGlassSurface className="pointer-events-auto rounded-full"><Link href="/wallet" aria-label={credits == null ? "View episode credits" : `View wallet: ${formatCredits(credits)}`} className="flex min-h-11 items-center gap-2 rounded-full px-3 text-[12px] font-semibold text-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4 sm:text-[13px]">
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full border border-[#e7b580]/45 bg-[#e7b580]/15 text-[13px] text-[#e7b580]">✦</span>
          <span>{credits === undefined ? "Credits …" : credits === null ? "View credits" : formatCredits(credits)}</span>
        </Link></LiquidGlassSurface>
        <LiquidGlassSurface className="pointer-events-auto rounded-full"><Link href="/profile" onClick={() => { try { sessionStorage.setItem("profile-return-path", `${location.pathname}${location.search}${location.hash}`); } catch { /* Browser storage may be disabled. */ } window.dispatchEvent(new Event("gyro:profile-open")); }} aria-label="Open profile" className="grid size-11 place-items-center overflow-hidden rounded-full text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          {user?.avatarUrl && !avatarFailed ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} className="size-full object-cover" /> : <span>{(user?.displayName?.trim().split(/\s+/).slice(0, 2).map(name => name[0]).join("") || user?.email?.[0] || "U").toUpperCase()}</span>}
        </Link></LiquidGlassSurface>
      </div>
    </div>
    <div className="absolute inset-0 overflow-hidden">
      <DesertParallax onFeaturedReveal={onFeaturedReveal} />
    </div>
    {motionPermission && <div className="pointer-events-none absolute inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-30 flex lg:hidden flex-col items-center gap-2">
      {motionMessage && <p role="status" className="rounded-full bg-black/60 px-4 py-2 text-xs text-white/80">{motionMessage}</p>}
      <LiquidGlassButton type="button" onClick={() => void enableMotion()} className="min-h-11 rounded-full px-5 py-3 text-xs text-white">Allow motion access</LiquidGlassButton>
    </div>}
  </section>;
}
