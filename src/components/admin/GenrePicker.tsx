"use client";

import { useEffect, useState } from "react";
import { getTaxonomy, type Taxon } from "@/lib/content";

/** Toggle-pill multi-select of the backend's categories (genres). Controlled via categoryIds. */
export default function GenrePicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [cats, setCats] = useState<Taxon[]>([]);
  useEffect(() => {
    let live = true;
    getTaxonomy().then((t) => { if (live) setCats(t.categories); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  if (!cats.length) return <p className="text-[12px] text-white/35">Loading genres…</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {cats.map((c) => (
        <button key={c.id} type="button" onClick={() => toggle(c.id)} aria-pressed={value.includes(c.id)}
          className={`rounded-full px-3 py-1.5 text-[13px] transition-colors ${value.includes(c.id) ? "bg-white text-black" : "bg-white/8 text-white/70 hover:bg-white/15"}`}>
          {c.name}
        </button>
      ))}
    </div>
  );
}
