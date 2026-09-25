import type { PosterItem } from "@/lib/data";
import { InfoIcon, PlayIcon, StarIcon } from "./icons";
import { PosterArt } from "./PosterArt";

export function HeroBanner({ item }: { item: PosterItem }) {
  return (
    <div className="hidden lg:block">
      <div className="relative aspect-[21/9] w-full">
        <PosterArt gradient={item.gradient} title="" showTitle={false} />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-10 xl:p-12">
          <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/70 backdrop-blur-sm">
            Featured
          </span>
          <h1 className="max-w-xl text-5xl leading-none font-black tracking-tight text-white italic [text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">
            {item.title}
          </h1>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span>{item.genre}</span>
            <span className="text-white/30">•</span>
            <StarIcon className="h-4 w-4 text-amber-400" />
            <span className="text-amber-400">{item.rating}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              <PlayIcon className="h-4 w-4" />
              Play
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <InfoIcon className="h-4 w-4" />
              More Info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
