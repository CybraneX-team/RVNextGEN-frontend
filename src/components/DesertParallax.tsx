"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { PlayIcon } from "./icons";
import EpisodeExpansion, { type EpisodeSelection } from "./EpisodeExpansion";

function phase(value: number, start: number, end: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

const EPISODES = [2, 3, 4, 5, 6, 7, 8];
const HISTORY_KEY = "gyro-desert-recent-episodes";

function EpisodeCard({ episode, onOpen }: { episode: number; onOpen: (selection: EpisodeSelection) => void }) {
  return <button data-episode={episode} type="button" aria-label={`Play Episode ${String(episode).padStart(2, "0")}`} onClick={event => onOpen({ episode, origin: event.currentTarget })} className="group relative aspect-[9/16] w-[min(24dvh,130px)] shrink-0 snap-start overflow-hidden rounded-[11px] border border-white/15 bg-[#302116] text-left outline-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white/70">
    <span aria-hidden="true" className="absolute inset-[-8px] bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: episode % 2 === 0 ? "url('/images/distant-desert.png')" : "url('/images/foreground-dune.png')", backgroundPosition: episode % 2 === 0 ? `${42 + episode * 3}% center` : `${12 + episode * 2}% bottom` }} />
    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />
    <span className="absolute inset-x-2 bottom-2 text-[11px] font-semibold text-white sm:inset-x-3 sm:bottom-3 sm:text-[13px]">Episode {String(episode).padStart(2, "0")}</span>
  </button>;
}

function EpisodePicker({ selected, episodes, onSelect, openBelow = false }: { selected: number; episodes: number[]; onSelect: (episode: number) => void; openBelow?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    (root.current?.querySelector<HTMLButtonElement>(`[data-option="${selected}"]`) ?? root.current?.querySelector<HTMLButtonElement>("[data-option]"))?.focus({ preventScroll: true });
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, selected]);

  return <div ref={root} className="relative shrink-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen(!open)} onKeyDown={event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setOpen(true);
      }
    }} className="flex h-9 min-w-[138px] items-center justify-between gap-3 rounded-full border border-white/15 bg-white/8 px-3 text-[12px] font-medium text-white/85 backdrop-blur-md transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60">
      {!episodes.includes(selected) ? "Episode number" : `Episode ${String(selected).padStart(2, "0")}`}
      <svg aria-hidden="true" className={`size-3 text-white/60 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4" /></svg>
    </button>
    {open && <div id={menuId} role="menu" aria-label="Choose an episode" className={`absolute right-0 z-30 w-44 overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-[#241a14]/95 p-1.5 shadow-[0_12px_40px_#0008] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${openBelow ? "top-full mt-2 max-h-[min(240px,25dvh)]" : "bottom-full mb-2 max-h-[min(280px,35dvh)]"}`} onKeyDown={event => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus({ preventScroll: true });
        return;
      }
      const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]"));
      const index = options.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "ArrowDown" ? (index + 1) % options.length : event.key === "ArrowUp" ? (index - 1 + options.length) % options.length : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : -1;
      if (next >= 0) {
        event.preventDefault();
        options[next].focus({ preventScroll: true });
        options[next].scrollIntoView({ block: "nearest" });
      }
    }}>
      {episodes.map(episode => {
        return <button key={episode} type="button" role="menuitemradio" aria-checked={selected === episode} data-option={episode} tabIndex={-1} onClick={() => {
          onSelect(episode);
          setOpen(false);
          trigger.current?.focus({ preventScroll: true });
        }} className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-medium text-white/85 outline-none hover:bg-white/10 focus:bg-white/10 aria-checked:bg-white/15">
          Episode {String(episode).padStart(2, "0")}
          {selected === episode && <span aria-hidden="true" className="text-[#f4d6b0]">✓</span>}
        </button>;
      })}
    </div>}
  </div>;
}

export default function DesertParallax({ tilt }: { tilt: { x: number; y: number } }) {
  const featuredCard = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState<EpisodeSelection | null>(null);
  const [recentEpisodes, setRecentEpisodes] = useState<number[]>([]);
  const [visibleRecentEpisodes, setVisibleRecentEpisodes] = useState<number[]>([]);
  const [hiddenWatchedEpisodes, setHiddenWatchedEpisodes] = useState<number[]>([]);
  const upcomingEpisodes = EPISODES.filter(episode => !hiddenWatchedEpisodes.includes(episode));
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore browser-local demo watch history after hydration
        setRecentEpisodes([...new Set(saved.filter((episode): episode is number => Number.isInteger(episode) && episode >= 1 && episode <= 8))]);
      }
    } catch { /* Storage may be unavailable; retain in-memory history. */ }
  }, []);
  const closePlayer = useCallback(() => {
    if (playing) {
      // Until real playback exists, opening an episode records a demo watch.
      // Record history now; the visible carousel refreshes only once offscreen.
      const next = [playing.episode, ...recentEpisodes.filter(episode => episode !== playing.episode)];
      setRecentEpisodes(next);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* Keep session history. */ }
    }
    setPlaying(null);
  }, [playing, recentEpisodes]);
  const scroller = useRef<HTMLDivElement>(null);
  const scrollContent = useRef<HTMLDivElement>(null);
  const parallaxTrack = useRef<HTMLDivElement>(null);
  const episodeCarousel = useRef<HTMLDivElement>(null);
  const upcomingSection = useRef<HTMLDivElement>(null);
  const recentlyWatchedSection = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [savedFeatured, setSavedFeatured] = useState(false);
  const [episodesExpanded, setEpisodesExpanded] = useState(false);
  const [recentlyExpanded, setRecentlyExpanded] = useState(false);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [card, setCard] = useState(0);
  const cardValue = useRef(0);

  useEffect(() => {
    const section = upcomingSection.current;
    if (!section || playing) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Even a partially visible header or card keeps the whole row stable.
      // Player overlays do not count as scrolling the section out of view.
      if (!entry.isIntersecting) setHiddenWatchedEpisodes(recentEpisodes);
    }, { root: scroller.current, threshold: 0 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [recentEpisodes, playing]);

  function selectEpisode(episode: number) {
    setSelectedEpisode(episode);
    const carousel = episodeCarousel.current;
    const target = carousel?.querySelector<HTMLElement>(`[data-episode="${episode}"]`);
    if (carousel && target) {
      carousel.scrollTo({
        left: carousel.scrollLeft + target.getBoundingClientRect().left - carousel.getBoundingClientRect().left - 32,
        behavior: reducedMotion ? "instant" : "smooth",
      });
    }
  }

  useEffect(() => {
    const from = cardValue.current;
    const target = cardRevealed ? 1 : 0;
    let frame = 0;
    let started: number | undefined;
    const animate = (time: number) => {
      started ??= time;
      const elapsed = reducedMotion ? 1 : Math.min(1, (time - started) / 850);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      cardValue.current = from + (target - from) * eased;
      setCard(cardValue.current);
      if (elapsed < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [cardRevealed, reducedMotion]);

  useEffect(() => {
    const element = scroller.current;
    const content = scrollContent.current;
    if (!element || !content) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    let frame = 0;
    let stage: "before" | "holding" | "ready" | "released" = "before";
    let holdAt = 0;
    let holdUntil = 0;
    let transitionUntil = 0;
    let lastInput = 0;
    let touchActive = false;
    let touchStartY = 0;
    let freshTouch = false;
    let settleTimer = 0;
    const armNextGesture = () => {
      window.clearTimeout(settleTimer);
      if (stage !== "holding") return;
      const remaining = Math.max(holdUntil - performance.now(), 220 - (performance.now() - lastInput));
      if (remaining > 0 || touchActive) {
        settleTimer = window.setTimeout(armNextGesture, Math.max(80, remaining));
      } else stage = "ready";
    };
    const release = () => {
      stage = "released";
      transitionUntil = performance.now() + (preference.matches ? 0 : 1400);
      setRecentlyExpanded(true);
    };
    const onWheel = (event: WheelEvent) => {
      if (performance.now() < transitionUntil) { event.preventDefault(); return; }
      const fresh = performance.now() - lastInput > 220;
      lastInput = performance.now();
      if (event.deltaY <= 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (stage === "ready" && fresh) { event.preventDefault(); release(); }
      else if (stage === "holding" || stage === "ready") event.preventDefault();
      armNextGesture();
    };
    const onTouchStart = (event: TouchEvent) => {
      touchActive = true;
      freshTouch = stage === "ready";
      touchStartY = event.touches[0]?.clientY ?? 0;
      lastInput = performance.now();
    };
    const onTouchMove = (event: TouchEvent) => {
      if (performance.now() < transitionUntil) { event.preventDefault(); return; }
      lastInput = performance.now();
      if (touchStartY - (event.touches[0]?.clientY ?? touchStartY) <= 12) return;
      if (stage === "ready" && freshTouch) { event.preventDefault(); release(); }
      else if (stage === "holding" || stage === "ready") event.preventDefault();
    };
    const onTouchEnd = () => {
      touchActive = false;
      lastInput = performance.now();
      armNextGesture();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target !== element || !["ArrowDown", "PageDown", " "].includes(event.key)) return;
      if (performance.now() < transitionUntil) { event.preventDefault(); return; }
      if (stage === "ready" && !event.repeat) { event.preventDefault(); release(); }
      else if (stage === "holding" || stage === "ready") event.preventDefault();
    };
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const track = parallaxTrack.current;
        // Preserve the full-card pause, then use a small gesture to trigger
        // a complete timed transition instead of scrubbing it with scroll.
        // Reserve the final viewport of travel for the compact details layout.
        const travel = track ? Math.max(1, track.offsetHeight - element.clientHeight * 2 - 48) : 1;
        const nextProgress = Math.min(1, Math.max(0, element.scrollTop / travel * .84));
        setProgress(nextProgress);
        if (nextProgress >= .52) setCardRevealed(true);
        else if (nextProgress <= .5) setCardRevealed(false);
        if (element.scrollTop >= travel + 8) setEpisodesExpanded(true);
        else if (element.scrollTop <= travel - 24) setEpisodesExpanded(false);
        if (stage === "before" && element.scrollTop >= travel + 8) {
          stage = "holding";
          holdAt = travel + 8;
          holdUntil = performance.now() + (preference.matches ? 250 : 1000);
          armNextGesture();
        }
        if ((stage === "holding" || stage === "ready" || performance.now() < transitionUntil) && element.scrollTop > holdAt) {
          element.scrollTop = holdAt;
        }
        if (element.scrollTop <= travel - 24) {
          stage = "before";
          window.clearTimeout(settleTimer);
          setRecentlyExpanded(false);
        }
      });
    };
    element.addEventListener("scroll", update, { passive: true });
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd, { passive: true });
    element.addEventListener("touchcancel", onTouchEnd, { passive: true });
    element.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", update);
    update();
    return () => {
      element.removeEventListener("scroll", update);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
      element.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", updatePreference);
    };
  }, []);

  const focus = phase(progress, .04, .55);
  const caption = phase(card, .5, 1);
  const titleReveal = phase(progress, .06, .3);
  const featuredLift = episodesExpanded && card >= .999 ? 1 : 0;
  const carouselReveal = featuredLift;
  const compact = Boolean(featuredLift && recentlyExpanded);
  useEffect(() => {
    const section = recentlyWatchedSection.current;
    if (!section || playing) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Keep additions and replay ordering pending while this section is visible.
      if (!compact || !entry.isIntersecting) setVisibleRecentEpisodes(recentEpisodes);
    }, { root: scroller.current, threshold: 0 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [recentEpisodes, playing, compact]);
  const compactTop = "max(90px, calc(env(safe-area-inset-top) + 76px))";
  // Match the .40 card scale in both axes while reserving a separate text column.
  const compactWidth = "min(32vw, 144px, 15.75dvh)";
  const compactHeight = "min(56.888889vw, 256px, 28dvh)";
  const episodeRowHeight = upcomingEpisodes.length ? "calc(min(42.666667dvh, 231.111111px) + 56px)" : "140px";
  const expandedListTop = `calc(100% - max(7dvh, calc(env(safe-area-inset-bottom) + 24px)) - ${episodeRowHeight})`;
  const motion = reducedMotion ? 0 : 1;
  const drift = (1 - card * .65) * motion;

  return <div ref={scroller} tabIndex={0} aria-label="Desert parallax followed by episodes. Scroll to reveal the episode card and episode list." className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#100e0c] outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div ref={scrollContent}>
      <div ref={parallaxTrack} className="relative h-[calc(914dvh+48px)]">
        <div className="sticky top-0 flex h-dvh w-full items-center justify-center overflow-hidden [isolation:isolate]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,#674029_0%,#241913_40%,#100e0c_75%)]" style={{ opacity: card }} />
          <article ref={featuredCard} aria-label="Episode 01" className="relative shrink-0 overflow-hidden bg-[#53331f] transition-transform duration-[1400ms] ease-[cubic-bezier(.45,0,.2,1)] motion-reduce:transition-none" style={{
            width: `calc(${100 * (1 - card)}% + min(${80 * card}vw, ${360 * card}px, ${39.375 * card}dvh))`,
            height: `calc(${100 * (1 - card)}% + min(${(80 * 16 / 9) * card}vw, ${640 * card}px, ${70 * card}dvh))`,
            borderRadius: `${24 * card}px`,
            containerType: "inline-size",
            boxShadow: `0 ${40 * card}px ${120 * card}px #0009, 0 0 0 1px rgb(255 222 177 / ${card * .16})`,
            transform: compact
              ? `translate(calc(-50vw + 32px + min(16vw, 72px, 7.875dvh)), calc(-50dvh + ${compactTop} + min(28.444444vw, 128px, 14dvh))) scale(.40)`
              : `translateY(${-featuredLift * 16}dvh) scale(${1 - featuredLift * .44})`,
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
              <span aria-hidden="true" className="grid size-[40px] shrink-0 place-items-center rounded-full bg-black/25 text-white/85 backdrop-blur-md"><PlayIcon className="size-[14px]" /></span>
            </div>
            {card >= .999 && <button type="button" aria-label="Play Episode 01" onClick={() => { if (featuredCard.current) setPlaying({ episode: 1, origin: featuredCard.current }); }} className="absolute inset-0 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white" />}
          </article>
          <aside aria-label="Featured episode details" aria-hidden={!compact} inert={!compact} className="absolute right-8 z-[5] max-w-sm text-white transition-[opacity,transform] duration-[700ms] ease-out motion-reduce:transition-none" style={{ top: compactTop, left: `calc(32px + ${compactWidth} + 16px)`, opacity: compact ? 1 : 0, transform: `translateY(${compact ? 0 : 12}px)`, transitionDelay: compact && !reducedMotion ? "700ms" : "0ms", pointerEvents: compact ? "auto" : "none" }}>
            <p className="mb-2 text-[10px] font-semibold tracking-[.2em] text-[#f4d6b0]/75">RVNEXTGEN ORIGINAL</p>
            <h2 className="font-serif text-xl font-semibold leading-tight tracking-[-.035em] sm:text-3xl">A bond <em className="font-normal">beyond</em> words.</h2>
            <p className="mt-2 text-[11px] font-medium text-white/55 sm:text-sm">Episode 01</p>
            <p className="mt-3 hidden text-xs leading-relaxed text-white/65 sm:block">A quiet journey across the desert brings an unexpected bond to life.</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => { if (featuredCard.current) setPlaying({ episode: 1, origin: featuredCard.current }); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-[#1a130e] transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <PlayIcon className="size-3.5" /> Play
              </button>
              <button type="button" aria-pressed={savedFeatured} onClick={() => setSavedFeatured(!savedFeatured)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 text-xs font-medium text-white/90 backdrop-blur-md transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill={savedFeatured ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.8L6 21V4.75Z" /></svg>
                {savedFeatured ? "Saved" : "Save"}
              </button>
            </div>
          </aside>
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[max(30px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 text-white/70" style={{ opacity: 1 - phase(progress, 0, .12) }}>
            <svg width="20" height="32" viewBox="0 0 20 32" fill="none"><path d="M10 2v24m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div role="region" aria-label="Episode lists" aria-hidden={!featuredLift} inert={!featuredLift} className={`absolute inset-x-0 bottom-0 z-10 transition-[transform,opacity,top] duration-[1400ms] ease-[cubic-bezier(.45,0,.2,1)] motion-reduce:transition-none ${compact ? "overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "overflow-visible"}`} style={{ top: compact ? `calc(${compactTop} + max(${compactHeight}, 224px) + 24px)` : expandedListTop, opacity: carouselReveal, transform: `translateY(${(1 - carouselReveal) * 110}%)`, pointerEvents: featuredLift ? "auto" : "none" }}>
            <div className="mx-auto w-full max-w-5xl">
              <div ref={upcomingSection} className="relative">
                <div className="mb-3 flex items-center justify-between gap-3 px-8">
                  <h3 className="text-[13px] font-semibold tracking-[.04em] text-white/85">More episodes</h3>
                  {upcomingEpisodes.length > 0 && <EpisodePicker key={`${featuredLift}-${compact}`} selected={selectedEpisode} episodes={upcomingEpisodes} onSelect={selectEpisode} openBelow={compact} />}
                </div>
                <div ref={episodeCarousel} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-8 px-8 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
                  {upcomingEpisodes.map(episode => <EpisodeCard key={episode} episode={episode} onOpen={selection => { setSelectedEpisode(selection.episode); setPlaying(selection); }} />)}
                  {upcomingEpisodes.length === 0 && <p className="py-8 text-sm text-white/50">You’re all caught up. Replay an episode below.</p>}
                </div>
                <div aria-hidden={!featuredLift || compact} className="pointer-events-none absolute inset-x-8 top-full mt-1 flex items-center justify-center gap-2 text-[10px] leading-3 font-medium tracking-[.04em] text-white/45 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none" style={{ opacity: featuredLift && !compact ? 1 : 0, transform: `translateY(${compact ? -6 : 0}px)` }}>
                  <span>Scroll for recently watched</span>
                  <svg aria-hidden="true" className="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v13m-4-4 4 4 4-4" /></svg>
                </div>
              </div>
              <section ref={recentlyWatchedSection} aria-label="Recently watched" aria-hidden={!compact} inert={!compact} className="relative mx-auto w-full max-w-5xl pt-8 pb-[max(100px,calc(env(safe-area-inset-bottom)+80px))] transition-[opacity,transform] duration-[1000ms] ease-out motion-reduce:transition-none" style={{ opacity: compact ? 1 : 0, transform: `translateY(${compact ? 0 : 28}px)`, visibility: compact ? "visible" : "hidden", transitionDelay: compact && !reducedMotion ? "350ms" : "0ms" }}>
                <h3 className="mb-4 px-8 text-[13px] font-semibold tracking-[.04em] text-white/85">Recently watched</h3>
                {visibleRecentEpisodes.length > 0 ? <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-8 px-8 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
                  {visibleRecentEpisodes.map(episode => <EpisodeCard key={episode} episode={episode} onOpen={setPlaying} />)}
                </div> : <p className="px-8 py-6 text-sm text-white/50">Episodes you open will appear here.</p>}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
    {playing && <EpisodeExpansion selection={playing} onClose={closePlayer} />}
  </div>;
}
