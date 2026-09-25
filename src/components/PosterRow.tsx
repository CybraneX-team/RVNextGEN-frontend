import type { PosterItem } from "@/lib/data";
import { PosterCard } from "./PosterCard";
import { SectionHeader } from "./SectionHeader";

export function PosterRow({ title, items }: { title: string; items: PosterItem[] }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title={title} />
      <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1 lg:gap-4">
        {items.map((item) => (
          <PosterCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
