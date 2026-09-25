import type { WideItem } from "@/lib/data";
import { PosterArt } from "./PosterArt";

export function WideCard({ item }: { item: WideItem }) {
  return (
    <div className="w-56 flex-shrink-0 sm:w-64 lg:w-80 xl:w-96">
      <div className="relative aspect-[16/10] w-full">
        <PosterArt gradient={item.gradient} title="" showTitle={false} />
        <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {item.duration}
        </span>
      </div>
      <div className="mt-2.5">
        <p className="line-clamp-1 text-sm font-medium text-white">{item.title}</p>
        <p className="mt-0.5 text-xs text-white/50">{item.subtitle}</p>
      </div>
    </div>
  );
}
