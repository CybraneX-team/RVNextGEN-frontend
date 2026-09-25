"use client";

import { useEffect, useRef, useState } from "react";
import type { PosterItem } from "@/lib/data";
import { PlayIcon, StarIcon } from "./icons";
import { PosterArt } from "./PosterArt";

export function HeroFeatured({ items }: { items: PosterItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const slides = Array.from(track.children) as HTMLElement[];
    if (slides.length === 0) return;

    let ticking = false;
    const updateActive = () => {
      ticking = false;
      const trackCenter = track.scrollLeft + track.clientWidth / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;
      slides.forEach((slide, index) => {
        const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
        const distance = Math.abs(slideCenter - trackCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      setActive(closestIndex);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateActive);
      }
    };

    updateActive();
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [items.length]);

  const current = items[active];

  return (
    <div className="lg:hidden">
      <div
        ref={trackRef}
        className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto px-[15%] py-1"
      >
        {items.map((item, index) => {
          const isActive = index === active;
          return (
            <div
              key={item.id}
              className="aspect-[3/4] w-[70%] flex-shrink-0 snap-center transition-all duration-300 ease-out"
              style={{
                opacity: isActive ? 1 : 0.35,
                filter: isActive ? "none" : "blur(1px) brightness(0.55)",
                transform: isActive ? "scale(1)" : "scale(0.92)",
              }}
            >
              <div className="relative h-full w-full">
                <PosterArt gradient={item.gradient} title={item.title} textClass={item.textClass} size="xl" />
                {isActive && (
                  <button
                    type="button"
                    aria-label={`Play ${item.title}`}
                    className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-black/60"
                  >
                    <PlayIcon className="ml-0.5 h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-center">
        <h2 className="text-lg font-semibold text-white">{current.title}</h2>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/50">
          <span>{current.genre}</span>
          <span className="text-white/30">•</span>
          <StarIcon className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-amber-400">{current.rating}</span>
        </p>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {items.map((item, index) => (
          <span
            key={item.id}
            className={`h-1.5 rounded-full transition-all duration-300 ${index === active ? "w-4 bg-white" : "w-1.5 bg-white/30"
              }`}
          />
        ))}
      </div>
    </div>
  );
}
