"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { PlayIcon } from "./icons";
import EpisodeExpansion, { type EpisodeSelection } from "./EpisodeExpansion";
import { GYRO_SERIES, SeriesArtwork } from "./GyroSeries";

function phase(value: number, start: number, end: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

const EPISODES = [2, 3, 4, 5, 6, 7, 8];
const EMPTY_EPISODES: number[] = [];

function EpisodeCard({ episode, onOpen, seriesIndex }: { episode: number; onOpen: (selection: EpisodeSelection) => void; seriesIndex: number }) {
  return <button data-episode={episode} type="button" aria-label={`Play Episode ${String(episode).padStart(2, "0")}`} onClick={event => onOpen({ episode, origin: event.currentTarget })} className="group relative aspect-[9/16] w-[min(24dvh,130px)] shrink-0 snap-start overflow-hidden rounded-[11px] border border-white/15 bg-[#302116] text-left outline-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white/70">
    {seriesIndex === 0 ? <span aria-hidden="true" className="absolute inset-[-8px] bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: episode % 2 === 0 ? "url('/images/distant-desert.png')" : "url('/images/foreground-dune.png')", backgroundPosition: episode % 2 === 0 ? `${42 + episode * 3}% center` : `${12 + episode * 2}% bottom` }} /> : <SeriesArtwork index={seriesIndex} />}
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

export default function DesertParallax({ tilt, onFeaturedReveal }: { tilt: { x: number; y: number }; onFeaturedReveal?: (visible: boolean) => void }) {
  const [seriesIndex, setSeriesIndex] = useState(0);
  const series = GYRO_SERIES[seriesIndex];
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const wheelTime = useRef(0);
  const featuredCard = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState<EpisodeSelection | null>(null);
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const [visibleHistory, setVisibleHistory] = useState<Record<string, number[]>>({});
  const [hiddenHistory, setHiddenHistory] = useState<Record<string, number[]>>({});
  const recentEpisodes = history[series.id] ?? EMPTY_EPISODES;
  const visibleRecentEpisodes = visibleHistory[series.id] ?? EMPTY_EPISODES;
  const hiddenWatchedEpisodes = hiddenHistory[series.id] ?? EMPTY_EPISODES;
  const upcomingEpisodes = EPISODES.filter(episode => !hiddenWatchedEpisodes.includes(episode));
  useEffect(() => {
    try {
      const restored: Record<string, number[]> = {};
      for (const entry of GYRO_SERIES) {
        const saved: unknown = JSON.parse(localStorage.getItem(entry.historyKey) ?? "[]");
        if (Array.isArray(saved)) restored[entry.id] = [...new Set(saved.filter((episode): episode is number => Number.isInteger(episode) && episode >= 1 && episode <= 8))];
      }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore browser-local demo watch history after hydration
        setHistory(restored);
    } catch { /* Storage may be unavailable; retain in-memory history. */ }
  }, []);
  const closePlayer = useCallback(() => {
    if (playing) {
      // Until real playback exists, opening an episode records a demo watch.
      // Record history now; the visible carousel refreshes only once offscreen.
      const next = [playing.episode, ...recentEpisodes.filter(episode => episode !== playing.episode)];
      setHistory(previous => ({ ...previous, [series.id]: next }));
      try { localStorage.setItem(series.historyKey, JSON.stringify(next)); } catch { /* Keep session history. */ }
    }
    setPlaying(null);
  }, [playing, recentEpisodes, series]);
  const scroller = useRef<HTMLDivElement>(null);
  const scrollContent = useRef<HTMLDivElement>(null);
  const parallaxTrack = useRef<HTMLDivElement>(null);
  const episodeCarousel = useRef<HTMLDivElement>(null);
  const upcomingSection = useRef<HTMLDivElement>(null);
  const recentlyWatchedSection = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [savedSeries, setSavedSeries] = useState<Record<string, boolean>>({});
  const savedFeatured = savedSeries[series.id] ?? false;
  const [episodesExpanded, setEpisodesExpanded] = useState(false);
  const [recentlyExpanded, setRecentlyExpanded] = useState(false);
  const [cardRevealed, setCardRevealed] = useState(false);
  const restoredReturnScroll = useRef<number | null>(null);
  const card = cardRevealed ? 1 : 0;
  const morphSurface = useRef<HTMLDivElement>(null);
  const previousSize = useRef<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const surface = morphSurface.current;
    if (!surface) return;
    const width = surface.offsetWidth;
    const height = surface.offsetHeight;
    const previous = previousSize.current;
    // Lay out the destination once; transform its composited layers instead of
    // resizing and repainting the blurred artwork on every animation frame.
    const animation = previous && width && height && !reducedMotion
      ? surface.animate([
        { transform: `scale(${previous.width / width}, ${previous.height / height})` },
        { transform: "scale(1, 1)" },
      ], { duration: 700, easing: "cubic-bezier(.22,1,.36,1)" })
      : null;
    return () => {
      // A reversal starts from the current visual size, without snapping.
      const matrix = new DOMMatrixReadOnly(getComputedStyle(surface).transform);
      previousSize.current = { width: width * matrix.a, height: height * matrix.d };
      animation?.cancel();
    };
  }, [cardRevealed, reducedMotion]);

  useEffect(() => {
    const section = upcomingSection.current;
    if (!section || playing) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Even a partially visible header or card keeps the whole row stable.
      // Player overlays do not count as scrolling the section out of view.
      if (!entry.isIntersecting) setHiddenHistory(previous => previous[series.id] === recentEpisodes ? previous : ({ ...previous, [series.id]: recentEpisodes }));
    }, { root: scroller.current, threshold: 0 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [recentEpisodes, playing, series.id]);

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

  useLayoutEffect(() => {
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
    const saveReturnPosition = () => {
      try { sessionStorage.setItem("gyro-profile-return-scroll", String(element.scrollTop)); } catch { /* Browser storage may be disabled. */ }
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
    window.addEventListener("gyro:profile-open", saveReturnPosition);
    window.addEventListener("resize", update);
    try {
      const savedScroll = restoredReturnScroll.current ?? Number(sessionStorage.getItem("gyro-profile-return-scroll"));
      if (Number.isFinite(savedScroll) && savedScroll > 0) {
        restoredReturnScroll.current = savedScroll;
        const track = parallaxTrack.current;
        const travel = track ? Math.max(1, track.offsetHeight - element.clientHeight * 2 - 48) : 1;
        element.scrollTop = savedScroll;
        stage = savedScroll >= travel + 8 ? "released" : "before";
        const restoredProgress = Math.min(1, Math.max(0, savedScroll / travel * .84));
        const restoredCard = restoredProgress >= .52 ? 1 : 0;
        setProgress(restoredProgress);
        setCardRevealed(restoredCard === 1);
        // The card transition is handled by CSS, so returning from Profile
        // animates at the same speed as scrolling without a React render loop.
        setEpisodesExpanded(savedScroll >= travel + 8);
        setRecentlyExpanded(savedScroll >= travel + element.clientHeight * .3);
        sessionStorage.removeItem("gyro-profile-return-scroll");
      }
    } catch { /* Start at the top if browser storage is disabled. */ }
    update();
    return () => {
      element.removeEventListener("scroll", update);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
      element.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("gyro:profile-open", saveReturnPosition);
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
      if (!compact || !entry.isIntersecting) setVisibleHistory(previous => previous[series.id] === recentEpisodes ? previous : ({ ...previous, [series.id]: recentEpisodes }));
    }, { root: scroller.current, threshold: 0 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [recentEpisodes, playing, compact, series.id]);
  const canSwipeSeries = card >= .999 && !episodesExpanded && !playing;
  const selectSeries = (index: number) => {
    if (!canSwipeSeries) return;
    setSeriesIndex(Math.max(0, Math.min(GYRO_SERIES.length - 1, index)));
    setSelectedEpisode(1);
  };
  const compactTop = "max(90px, calc(env(safe-area-inset-top) + 76px))";
  // Match the .40 card scale in both axes while reserving a separate text column.
  const compactWidth = "min(32vw, 144px, 15.75dvh)";
  const compactHeight = "min(56.888889vw, 256px, 28dvh)";
  const episodeRowHeight = upcomingEpisodes.length ? "calc(min(42.666667dvh, 231.111111px) + 56px)" : "140px";
  const expandedListTop = `calc(100% - max(7dvh, calc(env(safe-area-inset-bottom) + 24px)) - ${episodeRowHeight})`;
  const motion = reducedMotion ? 0 : 1;
  const drift = (1 - card * .65) * motion;
  const featuredVisible = card >= .999;
  useEffect(() => {
    onFeaturedReveal?.(featuredVisible);
  }, [featuredVisible, onFeaturedReveal]);

  return <div ref={scroller} tabIndex={0} aria-label="Desert parallax followed by episodes. Scroll to reveal the episode card and episode list." className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#100e0c] outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div ref={scrollContent}>
      <div ref={parallaxTrack} className="relative h-[calc(914dvh+48px)]">
        <div className="sticky top-0 flex h-dvh w-full items-center justify-center overflow-hidden [isolation:isolate]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,#674029_0%,#241913_40%,#100e0c_75%)] transition-opacity duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none" style={{ opacity: card }} />
          <div aria-label="Featured series carousel" className="relative shrink-0 touch-pan-y transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none" onPointerDown={event => {
            swipeStart.current = { x: event.clientX, y: event.clientY };
            swiped.current = false;
          }} onPointerUp={event => {
            const start = swipeStart.current;
            swipeStart.current = null;
            if (!start || !canSwipeSeries) return;
            const dx = event.clientX - start.x;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
              swiped.current = true;
              selectSeries(seriesIndex + (dx < 0 ? 1 : -1));
            }
          }} onPointerCancel={() => { swipeStart.current = null; }} onClickCapture={event => { if (swiped.current) { event.preventDefault(); event.stopPropagation(); swiped.current = false; } }} onWheel={event => {
            if (canSwipeSeries && Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 12 && performance.now() - wheelTime.current > 800) {
              wheelTime.current = performance.now();
              selectSeries(seriesIndex + (event.deltaX > 0 ? 1 : -1));
            }
          }} style={{
            width: `calc(${100 * (1 - card)}% + min(${80 * card}vw, ${360 * card}px, ${39.375 * card}dvh))`,
            height: `calc(${100 * (1 - card)}% + min(${(80 * 16 / 9) * card}vw, ${640 * card}px, ${70 * card}dvh))`,
            transform: compact
              ? `translate(calc(-50vw + 32px + min(16vw, 72px, 7.875dvh)), calc(-50dvh + ${compactTop} + min(28.444444vw, 128px, 14dvh))) scale(.40)`
              : `translateY(${-featuredLift * 16}dvh) scale(${1 - featuredLift * .44})`,
          }}>
            <div ref={morphSurface} className="absolute inset-0 origin-center will-change-transform">
            {GYRO_SERIES.map((entry, index) => <article key={entry.id} ref={index === seriesIndex ? featuredCard : undefined} aria-label={`${entry.title} — Episode 01`} aria-hidden={index !== seriesIndex && !canSwipeSeries} inert={index !== seriesIndex && !canSwipeSeries} className="absolute inset-0 overflow-hidden bg-[#53331f] transition-[transform,opacity] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none" style={{ borderRadius: `${24 * card}px`, containerType: "inline-size", boxShadow: `0 ${40 * card}px ${120 * card}px #0009, 0 0 0 1px rgb(255 222 177 / ${card * .16})`, transform: `translateX(calc(${(index - seriesIndex) * 100}% + ${(index - seriesIndex) * 20}px))`, opacity: index === seriesIndex || canSwipeSeries ? 1 : 0 }}>
            <SeriesArtwork index={index} tilt={tilt} focus={focus} drift={drift} motion={motion} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#180e08]/90 via-transparent to-transparent" style={{ opacity: .12 + caption * .88 }} />
            <div className="pointer-events-none absolute inset-x-0 px-7 text-center text-[#fff4df] will-change-transform [text-shadow:0_2px_24px_#30120780]" style={{
              top: `calc(${104 - card * 80}px + env(safe-area-inset-top))`,
              opacity: titleReveal,
              transform: `translate3d(${tilt.x * .45 * drift}px,${tilt.y * .45 * drift + (1 - titleReveal) * 24 * motion}px,0)`,
            }}>
              <p className="mb-3 text-[clamp(11px,3cqw,15px)] font-bold tracking-[.22em]">AN RVNEXTGEN AI ORIGINAL</p>
              <h2 className="m-0 whitespace-nowrap font-serif text-[min(8cqw,88px)] leading-[1.08] font-semibold tracking-[-.045em]">{entry.lead} <em className="font-normal">{entry.emphasis}</em> {entry.end}</h2>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-6 py-5 transition-[opacity,transform] duration-700 ease-[cubic-bezier(.22,1,.36,1)] sm:px-8 sm:py-7" style={{ opacity: caption, transform: `translateY(${(1 - caption) * 16}px)`, visibility: caption > 0 ? "visible" : "hidden" }}>
              <h1 className="text-[22px] font-bold tracking-[-.04em] text-white sm:text-[30px]">Episode 01</h1>
              <span aria-hidden="true" className="grid size-[40px] shrink-0 place-items-center rounded-full bg-black/25 text-white/85 backdrop-blur-md"><PlayIcon className="size-[14px]" /></span>
            </div>
            {card >= .999 && <button type="button" aria-label={index === seriesIndex ? `Play ${entry.title} Episode 01` : `View series ${index + 1}: ${entry.title}`} onClick={() => { if (index !== seriesIndex) selectSeries(index); else if (featuredCard.current) setPlaying({ episode: 1, origin: featuredCard.current }); }} className="absolute inset-0 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white" />}
          </article>)}
            </div>
          <div aria-hidden={!canSwipeSeries} inert={!canSwipeSeries} className="absolute inset-x-0 top-full mt-5 flex items-center justify-center gap-3 text-[12px] text-white/60 transition-opacity duration-300" style={{ opacity: canSwipeSeries ? 1 : 0 }}>
            <button type="button" onClick={() => selectSeries(seriesIndex === 0 ? 1 : 0)} className="flex min-h-8 items-center gap-2 rounded-full px-3 hover:text-white focus-visible:outline-2 focus-visible:outline-white">
              {seriesIndex === 1 && <span aria-hidden="true">←</span>}
              Swipe to view series {seriesIndex === 0 ? 2 : 1}
              {seriesIndex === 0 && <span aria-hidden="true">→</span>}
            </button>
          </div>
          </div>
          <aside aria-label="Featured episode details" aria-hidden={!compact} inert={!compact} className="absolute right-8 z-[5] max-w-sm text-white transition-[opacity,transform] duration-[700ms] ease-out motion-reduce:transition-none" style={{ top: compactTop, left: `calc(32px + ${compactWidth} + 16px)`, opacity: compact ? 1 : 0, transform: `translateY(${compact ? 0 : 12}px)`, transitionDelay: compact && !reducedMotion ? "700ms" : "0ms", pointerEvents: compact ? "auto" : "none" }}>
            <p className="mb-2 text-[10px] font-semibold tracking-[.2em] text-[#f4d6b0]/75">RVNEXTGEN ORIGINAL</p>
            <h2 className="font-serif text-xl font-semibold leading-tight tracking-[-.035em] sm:text-3xl">{series.lead} <em className="font-normal">{series.emphasis}</em> {series.end}</h2>
            <p className="mt-2 text-[11px] font-medium text-white/55 sm:text-sm">Episode 01</p>
            <p className="mt-3 hidden text-xs leading-relaxed text-white/65 sm:block">{series.description}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => { if (featuredCard.current) setPlaying({ episode: 1, origin: featuredCard.current }); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-semibold text-[#1a130e] transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <PlayIcon className="size-3.5" /> Play
              </button>
              <button type="button" aria-pressed={savedFeatured} onClick={() => setSavedSeries(previous => ({ ...previous, [series.id]: !savedFeatured }))} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 text-xs font-medium text-white/90 backdrop-blur-md transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill={savedFeatured ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.8L6 21V4.75Z" /></svg>
                {savedFeatured ? "Saved" : "Save"}
              </button>
            </div>
          </aside>
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[max(30px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 text-white/70" style={{ opacity: 1 - phase(progress, 0, .12) }}>
            <svg width="20" height="32" viewBox="0 0 20 32" fill="none"><path d="M10 2v24m-6-6 6 6 6-6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div role="region" aria-label="Episode lists" aria-hidden={!featuredLift} inert={!featuredLift} className={`absolute inset-x-0 bottom-0 z-10 transition-[transform,opacity,top] duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none ${compact ? "overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "overflow-visible"}`} style={{ top: compact ? `calc(${compactTop} + max(${compactHeight}, 224px) + 24px)` : expandedListTop, opacity: carouselReveal, transform: `translateY(${(1 - carouselReveal) * 110}%)`, pointerEvents: featuredLift ? "auto" : "none" }}>
            <div className="mx-auto w-full max-w-5xl">
              <div ref={upcomingSection} className="relative">
                <div className="mb-3 flex items-center justify-between gap-3 px-8">
                  <h3 className="text-[13px] font-semibold tracking-[.04em] text-white/85">More episodes</h3>
                  {upcomingEpisodes.length > 0 && <EpisodePicker key={`${featuredLift}-${compact}`} selected={selectedEpisode} episodes={upcomingEpisodes} onSelect={selectEpisode} openBelow={compact} />}
                </div>
                <div ref={episodeCarousel} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-8 px-8 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
                  {upcomingEpisodes.map(episode => <EpisodeCard key={`${series.id}-${episode}`} seriesIndex={seriesIndex} episode={episode} onOpen={selection => { setSelectedEpisode(selection.episode); setPlaying(selection); }} />)}
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
                  {visibleRecentEpisodes.map(episode => <EpisodeCard key={`${series.id}-${episode}`} seriesIndex={seriesIndex} episode={episode} onOpen={setPlaying} />)}
                </div> : <p className="px-8 py-6 text-sm text-white/50">Episodes you open will appear here.</p>}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
    {playing && <EpisodeExpansion selection={playing} seriesTitle={series.title} videoId={series.id === "desert" && playing.episode === 1 ? "NXnbLxUO4CU" : undefined} onClose={closePlayer} />}
  </div>;
}
