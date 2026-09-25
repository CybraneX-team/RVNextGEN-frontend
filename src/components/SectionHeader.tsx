import { ChevronRightIcon } from "./icons";

export function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <button
        type="button"
        aria-label={`See all ${title}`}
        className="text-white/40 transition hover:text-white/70"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
