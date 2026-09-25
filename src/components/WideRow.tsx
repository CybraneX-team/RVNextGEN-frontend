import type { WideItem } from "@/lib/data";
import { SectionHeader } from "./SectionHeader";
import { WideCard } from "./WideCard";

export function WideRow({ title, items }: { title: string; items: WideItem[] }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title={title} />
      <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1 lg:gap-4">
        {items.map((item) => (
          <WideCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
