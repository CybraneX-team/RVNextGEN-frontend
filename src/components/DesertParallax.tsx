"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon } from "./icons";

function phase(value: number, start: number, end: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export default function DesertParallax({ tilt, onPlay }: { tilt: { x: number; y: number }; onPlay?: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollContent = useRef<HTMLDivElement>(null);
  const parallaxTrack = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  useEffect(() => {
    const element = scroller.current;
    const content = scrollContent.current;
    if (!element || !content) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const track = parallaxTrack.current;
        const travel = track ? Math.max(1, track.offsetHeight - element.clientHeight) : 1;
        setProgress(Math.min(1, Math.max(0, element.scrollTop / travel)));
      });
    };
    element.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      element.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", updatePreference);
    };
  }, []);

  const focus = phase(progress, .04, .55);
  const card = phase(progress, .52, .78);
  const caption = phase(progress, .64, .78);
  const titleReveal = phase(progress, .06, .3);
  const featuredLift = phase(progress, .88, .98);
  const carouselReveal = featuredLift;
  const motion = reducedMotion ? 0 : 1;
  const drift = (1 - card * .65) * motion;

  return <div ref={scroller} tabIndex={0} aria-label="Desert parallax followed by episodes. Scroll to reveal the episode card and episode list." className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#100e0c] outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div ref={scrollContent}>
      <div ref={parallaxTrack} className="relative h-[850dvh]">
        <div className="sticky top-0 flex h-dvh w-full items-center justify-center overflow-hidden [isolation:isolate]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,#674029_0%,#241913_40%,#100e0c_75%)]" style={{ opacity: card }} />
          <article aria-label="Episode 01" className="relative shrink-0 overflow-hidden bg-[#53331f]" style={{
            width: `calc(${100 * (1 - card)}% + min(${80 * card}vw, ${360 * card}px, ${39.375 * card}dvh))`,
            height: `calc(${100 * (1 - card)}% + min(${(80 * 16 / 9) * card}vw, ${640 * card}px, ${70 * card}dvh))`,
            borderRadius: `${24 * card}px`,
            containerType: "inline-size",
            boxShadow: `0 ${40 * card}px ${120 * card}px #0009, 0 0 0 1px rgb(255 222 177 / ${card * .16})`,
            transform: `translateY(${-featuredLift * 16}dvh) scale(${1 - featuredLift * .38})`,
          }}>
            <div aria-hidden="true" className="absolute inset-[-48px] bg-cover bg-[position:58%_center] will-change-transform motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out" style={{
              backgroundImage: "url('/images/distant-desert.png')",
              transform: `translate3d(${-tilt.x * .7 * drift}px,${-tilt.y * .7 * drift}px,0) scale(${1.06 + focus * .24 * motion})`,
              filter: `blur(${focus * 13 * motion}px)`,
            }} />
            <div aria-hidden="true" className="absolute inset-[-50px] scale-80 origin-bottom bg-cover bg-[position:10%_bottom] will-change-transform motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out sm:bg-[position:center_bottom]" style={{
              backgroundImage: "url('/images/foreground-dune.png')",
              transform: `translate3d(${tilt.x * 1.25 * drift}px,${tilt.y * drift + focus * 28 * motion}px,0) scale(${1.04 + focus * .07 * motion})`,
            }} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#180e08]/90 via-transparent to-transparent" style={{ opacity: .12 + caption * .88 }} />
            <div className="pointer-events-none absolute inset-x-0 px-7 text-center text-[#fff4df] will-change-transform motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out [text-shadow:0_2px_24px_#30120780]" style={{
              top: `calc(${104 - card * 80}px + env(safe-area-inset-top))`,
              opacity: titleReveal,
              transform: `translate3d(${tilt.x * .45 * drift}px,${tilt.y * .45 * drift + (1 - titleReveal) * 24 * motion}px,0)`,
            }}>
              <p className="mb-3 text-[clamp(11px,3cqw,15px)] font-bold tracking-[.22em]">AN RVNEXTGEN AI ORIGINAL</p>
              <h2 className="m-0 whitespace-nowrap font-serif text-[min(8cqw,88px)] leading-[1.08] font-semibold tracking-[-.045em]">A bond <em className="font-normal">beyond</em> words.</h2>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-6 py-5 sm:px-8 sm:py-7" style={{ opacity: caption, transform: `translateY(${(1 - caption) * 16}px)`, visibility: caption > 0 ? "visible" : "hidden" }}>
              <h1 className="text-[22px] font-bold tracking-[-.04em] text-white sm:text-[30px]">Episode 01</h1>
              <button type="button" onClick={onPlay} disabled={!onPlay} aria-label="Play Episode 01" title={onPlay ? "Play Episode 01" : "Episode video is not connected yet"} className="grid size-[40px] shrink-0 place-items-center rounded-full bg-black/25 text-white/85 backdrop-blur-md enabled:hover:bg-white/15"><PlayIcon className="size-[14px]" /></button>
            </div>
          </article>
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[max(30px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 text-white/70" style={{ opacity: 1 - phase(progress, 0, .12) }}>
            <svg width="20" height="32" viewBox="0 0 20 32" fill="none"><path d="M10 2v24m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div role="region" aria-label="More episodes" className="absolute inset-x-0 bottom-[max(7dvh,calc(env(safe-area-inset-bottom)+24px))] z-10" style={{ opacity: carouselReveal, transform: `translateY(${(1 - carouselReveal) * 64}px)`, pointerEvents: carouselReveal > .99 ? "auto" : "none" }}>
            <div className="mx-auto w-full max-w-5xl">
              <h3 className="mb-3 px-8 text-[13px] font-semibold tracking-[.04em] text-white/85">More episodes</h3>
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-8 px-8 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
                {Array.from({ length: 7 }, (_, index) => {
                  const episode = index + 2;
                  return <button key={episode} type="button" aria-label={`Episode ${String(episode).padStart(2, "0")}`} onClick={() => setSelectedEpisode(episode)} aria-pressed={selectedEpisode === episode} className={`group relative aspect-[9/16] w-[min(24dvh,130px)] shrink-0 snap-start overflow-hidden rounded-[11px] border bg-[#302116] text-left transition-[border-color,transform] ${selectedEpisode === episode ? "scale-[1.03] border-[#f4d6b0]/90" : "border-white/15 hover:border-white/45"}`}>
                    <span aria-hidden="true" className="absolute inset-[-8px] bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: episode % 2 === 0 ? "url('/images/distant-desert.png')" : "url('/images/foreground-dune.png')", backgroundPosition: episode % 2 === 0 ? `${42 + episode * 3}% center` : `${12 + episode * 2}% bottom` }} />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />
                    <span className="absolute inset-x-2 bottom-2 text-[11px] font-semibold text-white sm:inset-x-3 sm:bottom-3 sm:text-[13px]">Episode {String(episode).padStart(2, "0")}</span>
                  </button>;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
