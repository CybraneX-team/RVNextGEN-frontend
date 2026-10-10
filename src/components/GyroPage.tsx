"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DesertParallax from "./DesertParallax";
import { useAuth } from "./AuthProvider";

export default function GyroPage({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [featuredVisible, setFeaturedVisible] = useState(false);
  const onFeaturedReveal = useCallback((visible: boolean) => setFeaturedVisible(visible), []);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const backClass = "grid size-11 shrink-0 place-items-center rounded-full border border-white/15 bg-black/25 text-white/90 backdrop-blur-xl hover:bg-black/40";
  const backIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-5" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>;
  return <section aria-label="Immersive series viewer" className="fixed inset-0 z-50 h-dvh w-full overflow-hidden bg-[#09100d] text-white">
    {onClose && <button type="button" onClick={onClose} aria-label="Back to home" className={`absolute left-4 top-[max(16px,env(safe-area-inset-top))] z-30 ${backClass}`}>{backIcon}</button>}
    <div inert={!featuredVisible} className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end bg-gradient-to-b from-black/25 to-transparent px-4 pt-[max(16px,env(safe-area-inset-top))] pb-12 transition-opacity duration-500 sm:px-6 ${featuredVisible ? "opacity-100" : "opacity-0"}`} aria-hidden={!featuredVisible}>
      <Link href="/profile" onClick={() => { try { sessionStorage.setItem("profile-return-path", `${location.pathname}${location.search}${location.hash}`); } catch { /* Browser storage may be disabled. */ } window.dispatchEvent(new Event("gyro:profile-open")); }} aria-label="Open profile" className="pointer-events-auto grid size-8 place-items-center overflow-hidden rounded-full border border-white/20 bg-black/30 text-sm font-semibold text-white shadow-lg backdrop-blur-xl transition hover:bg-black/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        {user?.avatarUrl && !avatarFailed ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} className="size-full object-cover" /> : <span>{(user?.displayName?.trim().split(/\s+/).slice(0, 2).map(name => name[0]).join("") || user?.email?.[0] || "U").toUpperCase()}</span>}
      </Link>
    </div>
    <div className="absolute inset-0 overflow-hidden">
      <DesertParallax onFeaturedReveal={onFeaturedReveal} />
    </div>
  </section>;
}
