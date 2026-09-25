"use client";

import { useId } from "react";

type Size = "sm" | "md" | "lg" | "xl";

const titleSizeClasses: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm sm:text-base",
  lg: "text-2xl sm:text-3xl",
  xl: "text-4xl sm:text-5xl",
};

export function PosterArt({
  gradient,
  title,
  textClass = "text-white",
  size = "md",
  showTitle = true,
}: {
  gradient: string;
  title: string;
  textClass?: string;
  size?: Size;
  showTitle?: boolean;
}) {
  const filterId = useId();

  return (
    <div className={`relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br ${gradient}`}>
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-[0.12] mix-blend-overlay">
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/10" />
      {showTitle && title && (
        <div className="absolute inset-0 flex items-end justify-center p-3">
          <span
            className={`${titleSizeClasses[size]} ${textClass} text-center font-black uppercase italic leading-[0.95] tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.65)]`}
          >
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
