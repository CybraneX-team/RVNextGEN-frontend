import type { PosterItem } from "@/lib/data";
import { PosterArt } from "./PosterArt";

export function PosterCard({ item }: { item: PosterItem }) {
  return (
    <div className="w-32 flex-shrink-0 sm:w-36 lg:w-44 xl:w-48">
      <div className="aspect-[2/3] w-full">
        <PosterArt gradient={item.gradient} title={item.title} textClass={item.textClass} />
      </div>
    </div>
  );
}
